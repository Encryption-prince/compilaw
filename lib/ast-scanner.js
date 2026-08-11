// ast-scanner.js
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const { matchPattern } = require("./patterns");

const THIRD_PARTY_HINTS = /track|analytics|sentry|mixpanel|segment|amplitude|fetch|axios|post|send|emit|publish|webhook|log/i;

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

function scanJSFileWithAST(filePath, content) {
    const results = [];
    const piiVariableNames = new Map();

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
        VariableDeclarator(path) {
            if (path.node.id.type === "Identifier") {
                recordDeclaration(path.node.id.name, path.node.loc.start.line, filePath, results, piiVariableNames);
            }
        },
        ObjectProperty(path) {
            if (path.node.key.type === "Identifier") {
                recordDeclaration(path.node.key.name, path.node.loc.start.line, filePath, results, piiVariableNames);
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
            });
        },
        CallExpression(path) {
            const calleeName = getCalleeName(path.node.callee);
            if (/^console\./i.test(calleeName)) return;

            path.node.arguments.forEach((arg) => {
                if (arg.type === "Identifier" && piiVariableNames.has(arg.name)) {
                    const category = piiVariableNames.get(arg.name);
                    const isExternal = THIRD_PARTY_HINTS.test(calleeName);

                    results.push({
                        file: filePath,
                        line: arg.loc.start.line,
                        category: category,
                        snippet: `${arg.name} passed to ${calleeName}()`,
                        confidence: isExternal ? 0.6 : 0.5,
                        type: "data-flow",
                        externalRisk: isExternal,
                    });
                }
            });
        },
    });

    return results;
}

module.exports = { scanJSFileWithAST };