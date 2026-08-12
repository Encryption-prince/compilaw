// ast-scanner.js
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const { matchPattern } = require("./patterns");

const THIRD_PARTY_HINTS = /track|analytics|sentry|mixpanel|segment|amplitude|fetch|axios|post|send|emit|publish|webhook|log|mailer|smtp|sendgrid|twilio|firebase|supabase|mongo|redis|kafka|rabbit|queue|s3|upload|store|save|insert|create|update|put/i;

const LOGGING_HINTS = /console\.(log|warn|error|info|debug)|logger\.|winston\.|pino\.|bunyan\./i;

function recordDeclaration(name, line, filePath, results, piiVariableNames) {
    const pattern = matchPattern(name);
    if (pattern) {
        results.push({
            file: filePath,
            line,
            category: pattern.label,
            snippet: name,
            confidence: pattern.confidence || 0.7,
            type: "declaration",
        });
        piiVariableNames.set(name, pattern.label);
    }
}

function getCalleeName(node) {
    if (node.type === "Identifier") return node.name;
    if (node.type === "MemberExpression") {
        const objectName = node.object.type === "Identifier" ? node.object.name : "?";
        const propName = node.property && node.property.type === "Identifier" ? node.property.name : "?";
        return `${objectName}.${propName}`;
    }
    return "unknown()";
}

// Recursively collect all identifier names referenced in an expression node.
// Catches spreads, template literals, object/array expressions, binary ops, etc.
function collectIdentifiers(node) {
    const names = [];
    if (!node) return names;
    if (node.type === "Identifier") {
        names.push(node.name);
    } else if (node.type === "SpreadElement" || node.type === "RestElement") {
        names.push(...collectIdentifiers(node.argument));
    } else if (node.type === "ObjectExpression") {
        for (const prop of node.properties || []) {
            if (prop.type === "SpreadElement") {
                names.push(...collectIdentifiers(prop.argument));
            } else {
                names.push(...collectIdentifiers(prop.value));
            }
        }
    } else if (node.type === "ArrayExpression") {
        for (const el of node.elements || []) {
            names.push(...collectIdentifiers(el));
        }
    } else if (node.type === "TemplateLiteral") {
        for (const expr of node.expressions || []) {
            names.push(...collectIdentifiers(expr));
        }
    } else if (node.type === "BinaryExpression" || node.type === "LogicalExpression") {
        names.push(...collectIdentifiers(node.left));
        names.push(...collectIdentifiers(node.right));
    } else if (node.type === "MemberExpression") {
        names.push(...collectIdentifiers(node.object));
    } else if (node.type === "AssignmentExpression") {
        names.push(...collectIdentifiers(node.right));
    }
    return names;
}

function scanJSFileWithAST(filePath, content) {
    const results = [];
    const piiVariableNames = new Map(); // varName → category
    const piiObjectNames = new Set();   // objects that contain PII properties

    let ast;
    try {
        ast = parser.parse(content, {
            sourceType: "module",
            plugins: ["jsx", "typescript"],
        });
    } catch (err) {
        console.warn(`Could not parse (skipping): ${filePath}`);
        return results;
    }

    traverse(ast, {
        // ── Declaration nodes ───────────────────────────────────────────────
        VariableDeclarator(path) {
            const { id, init } = path.node;

            // Simple: const email = ...
            if (id.type === "Identifier") {
                recordDeclaration(id.name, id.loc.start.line, filePath, results, piiVariableNames);
            }

            // Destructuring: const { email, phone } = req.body
            if (id.type === "ObjectPattern") {
                const isFromRequest = init &&
                    init.type === "MemberExpression" &&
                    init.object.type === "Identifier" &&
                    /req|request|body|input/i.test(init.object.name);

                for (const prop of id.properties || []) {
                    if (prop.type === "ObjectProperty" && prop.key.type === "Identifier") {
                        recordDeclaration(prop.key.name, prop.key.loc.start.line, filePath, results, piiVariableNames);
                        // If the RHS looks like req.body — boost confidence
                        if (isFromRequest) {
                            const existing = results.find(r => r.snippet === prop.key.name && r.line === prop.key.loc.start.line);
                            if (existing) existing.confidence = Math.min(existing.confidence + 0.1, 1.0);
                        }
                    }
                }
            }

            // Track assignment: const userData = { email, phone }
            // — mark 'userData' as a PII-carrying object
            if (id.type === "Identifier" && init && init.type === "ObjectExpression") {
                const hasPiiProp = (init.properties || []).some(p =>
                    p.type === "ObjectProperty" &&
                    p.key.type === "Identifier" &&
                    matchPattern(p.key.name)
                );
                if (hasPiiProp) {
                    piiObjectNames.add(id.name);
                }
            }

            // Track: const userData = req.body (whole body assigned)
            if (id.type === "Identifier" && init &&
                init.type === "MemberExpression" &&
                init.property.type === "Identifier" &&
                /body|payload|data/i.test(init.property.name)) {
                piiObjectNames.add(id.name);
            }
        },

        ObjectProperty(path) {
            if (path.node.key.type === "Identifier") {
                recordDeclaration(path.node.key.name, path.node.loc.start.line, filePath, results, piiVariableNames);
                // If this property lives in a parent object, track parent too
                const parentVar = path.findParent(p =>
                    p.isVariableDeclarator() && p.node.id.type === "Identifier"
                );
                if (parentVar) {
                    piiObjectNames.add(parentVar.node.id.name);
                }
            }
        },

        ClassProperty(path) {
            if (path.node.key && path.node.key.type === "Identifier") {
                recordDeclaration(path.node.key.name, path.node.loc.start.line, filePath, results, piiVariableNames);
            }
        },

        Function(path) {
            path.node.params.forEach((param) => {
                if (param.type === "Identifier") {
                    recordDeclaration(param.name, param.loc.start.line, filePath, results, piiVariableNames);
                }
                // Destructured params: function save({ email, phone }) {}
                if (param.type === "ObjectPattern") {
                    for (const prop of param.properties || []) {
                        if (prop.type === "ObjectProperty" && prop.key.type === "Identifier") {
                            recordDeclaration(prop.key.name, prop.key.loc.start.line, filePath, results, piiVariableNames);
                        }
                    }
                }
            });
        },

        // Assignment: user.email = req.body.email
        AssignmentExpression(path) {
            const { left } = path.node;
            if (left.type === "MemberExpression" && left.property.type === "Identifier") {
                recordDeclaration(left.property.name, left.loc.start.line, filePath, results, piiVariableNames);
            }
        },

        // ── Call expressions — data flow ────────────────────────────────────
        CallExpression(path) {
            const calleeName = getCalleeName(path.node.callee);
            const line = path.node.loc.start.line;

            // Check each argument — including spreads, template literals, object literals
            for (const arg of path.node.arguments) {
                const referencedNames = collectIdentifiers(arg);

                for (const name of referencedNames) {
                    const category = piiVariableNames.get(name) || (piiObjectNames.has(name) ? "PII object" : null);
                    if (!category) continue;

                    const isLogger = LOGGING_HINTS.test(calleeName);
                    const isExternal = THIRD_PARTY_HINTS.test(calleeName);

                    // PII passed to a logger — high risk of accidental exposure
                    if (isLogger) {
                        results.push({
                            file: filePath,
                            line,
                            category,
                            snippet: `${name} passed to ${calleeName}() — PII in logs`,
                            confidence: 0.75,
                            type: "data-flow",
                            subtype: "logging-risk",
                            externalRisk: true,
                        });
                        continue;
                    }

                    // Skip non-suspicious internal calls
                    if (!isExternal) continue;

                    results.push({
                        file: filePath,
                        line,
                        category,
                        snippet: `${name} passed to ${calleeName}()`,
                        confidence: isExternal ? 0.65 : 0.5,
                        type: "data-flow",
                        subtype: "external-transmission",
                        externalRisk: isExternal,
                    });
                }
            }

            // Detect: res.json({ email, phone }) or res.send(userData)
            // — PII in HTTP responses without apparent filtering
            if (/res\.(json|send|render)\b/.test(calleeName)) {
                for (const arg of path.node.arguments) {
                    const referencedNames = collectIdentifiers(arg);
                    for (const name of referencedNames) {
                        const category = piiVariableNames.get(name) || (piiObjectNames.has(name) ? "PII object" : null);
                        if (category) {
                            results.push({
                                file: filePath,
                                line,
                                category,
                                snippet: `${name} included in ${calleeName}() response — verify response filtering`,
                                confidence: 0.55,
                                type: "data-flow",
                                subtype: "response-exposure",
                                externalRisk: false,
                            });
                        }
                    }
                }
            }
        },
    });

    return results;
}

module.exports = { scanJSFileWithAST };
