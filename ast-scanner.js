// ast-scanner.js
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const { PII_PATTERNS } = require("./patterns");

function checkName(name, line, filePath, results) {
    for (const pattern of PII_PATTERNS) {
        if (pattern.regex.test(name)) {
            results.push({
                file: filePath,
                line: line,
                category: pattern.label,
                snippet: name,
            });
        }
    }
}

function scanJSFileWithAST(filePath, content) {
    const results = [];

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
                checkName(path.node.id.name, path.node.loc.start.line, filePath, results);
            }
        },
        ObjectProperty(path) {
            if (path.node.key.type === "Identifier") {
                checkName(path.node.key.name, path.node.loc.start.line, filePath, results);
            }
        },
        ClassProperty(path) {
            if (path.node.key && path.node.key.type === "Identifier") {
                checkName(path.node.key.name, path.node.loc.start.line, filePath, results);
            }
        },
        Function(path) {
            path.node.params.forEach((param) => {
                if (param.type === "Identifier") {
                    checkName(param.name, param.loc.start.line, filePath, results);
                }
            });
        },
    });

    return results;
}

module.exports = { scanJSFileWithAST };