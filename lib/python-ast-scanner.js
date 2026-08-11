const { execSync } = require("child_process");
const path = require("path");
const { matchPattern } = require("./patterns");

function findPythonCommand() {
    const candidates = ["python3", "python"];
    for (const cmd of candidates) {
        try {
            execSync(`${cmd} --version`, { stdio: "ignore" });
            return cmd;
        } catch (err) {
            // try the next candidate
        }
    }
    return null;
}

const PYTHON_CMD = findPythonCommand();
const HELPER_SCRIPT = path.join(__dirname, "py_ast_helper.py");

function scanPythonFileWithAST(filePath) {
    if (!PYTHON_CMD) return null;

    try {
        const output = execSync(`${PYTHON_CMD} "${HELPER_SCRIPT}" "${filePath}"`, { encoding: "utf-8" });
        const rawFindings = JSON.parse(output);

        if (rawFindings === null) return null;

        const results = [];
        for (const item of rawFindings) {
            const pattern = matchPattern(item.name);
            if (pattern) {
                results.push({
                    file: filePath,
                    line: item.line,
                    category: pattern.label,
                    snippet: item.name,
                    confidence: pattern.confidence || 0.7,
                    type: "declaration",
                });
            }
        }
        return results;
    } catch (err) {
        console.warn(`Python AST parse failed (falling back to regex): ${filePath}`);
        return null;
    }
}

module.exports = { scanPythonFileWithAST, PYTHON_CMD };