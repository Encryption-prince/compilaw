// triage.js
// Decides which files deserve a deeper LLM semantic pass, instead of
// running the (slow, GPU-hungry) LLM on every single file.

// triage.js

const fs = require("fs");
const path = require("path");


const DATA_ENTRY_PATTERNS = [
    /req\.body/,
    /req\.query/,
    /req\.params/,
];

const DATA_EXIT_PATTERNS = [
    /\.insert\(|\.save\(|\.create\(|\.update\(/,
    /fetch\(|axios\.|\.post\(|\.put\(/,
];

function shouldTriageFile(filePath, content, astFindingsForFile) {
    const reasons = [];

    if (astFindingsForFile.length > 0) {
        reasons.push("AST already flagged something here — worth deeper context");
    }

    const hasDataEntry = DATA_ENTRY_PATTERNS.some((p) => p.test(content));
    if (hasDataEntry) {
        reasons.push("Reads directly from request body/query/params — likely handles raw user input");
    }

    const hasDataExit = DATA_EXIT_PATTERNS.some((p) => p.test(content));
    if (hasDataExit) {
        reasons.push("Writes to a database or sends data over the network");
    }

    const hasLocalImports = /require\(["']\.\//.test(content) || /from\s+["']\.\//.test(content);
    if (hasLocalImports && (astFindingsForFile.length > 0 || hasDataEntry || hasDataExit)) {
        reasons.push("Has local imports — possible cross-file data flow worth tracing");
    }

    return {
        shouldAnalyze: reasons.length > 0,
        reasons,
    };
}

function resolveLocalImports(filePath, content, targetFolder) {
    if (path.extname(filePath) === ".py") {
        return []; // Python cross-file import resolution not yet supported
    }
    const importRegex = /require\(["'](\.\/[^"']+)["']\)|from\s+["'](\.\/[^"']+)["']/g;
    const resolved = [];
    const dir = path.dirname(filePath);

    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1] || match[2];
        let fullPath = path.resolve(dir, importPath);

        const candidates = [fullPath, fullPath + ".js", fullPath + ".ts"];
        const found = candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());

        if (found) {
            try {
                const importedContent = fs.readFileSync(found, "utf-8");
                resolved.push({ path: found, content: importedContent.slice(0, 2000) });
            } catch (err) {
                // skip unreadable import
            }
        }
    }

    return resolved;
}

module.exports = { shouldTriageFile, resolveLocalImports };