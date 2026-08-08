#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { DPDP_RULES } = require("./rules");
const { runQuestionnaire } = require("./questionnaire");
const { scanDependencies } = require("./dependency-scanner");
const { PII_PATTERNS } = require("./patterns");
const { scanJSFileWithAST } = require("./ast-scanner");

console.log("CompiLaw scanner starting...");
if (process.argv[2] === "--help" || process.argv[2] === "-h") {
    console.log(`
CompiLaw — DPDP compliance gap scanner (V1)

Usage:
  compilaw <folder-path>

Example:
  compilaw ./my-project

What it does:
  Scans JS/TS/Python files in the given folder for PII-shaped fields,
  matches findings against a simplified DPDP Act 2023 rules knowledge base,
  scans package.json dependencies for risky open-source licenses,
  and writes a report to compilaw-report.txt and compilaw-report.json.

This tool is a technical aid, not legal advice.
`);
    process.exit(0);
}


const findings = [];

const EXCLUDE_PATTERNS = [
    /console\.(log|error|warn|info)/i,
];

function scanPythonFileWithRegex(filePath, content) {
    const lines = content.split("\n");

    lines.forEach((lineText, index) => {
        const lineNumber = index + 1;

        const isExcluded = EXCLUDE_PATTERNS.some((pattern) => pattern.test(lineText));
        if (isExcluded) return;

        for (const pattern of PII_PATTERNS) {
            if (pattern.regex.test(lineText)) {
                findings.push({
                    file: filePath,
                    line: lineNumber,
                    category: pattern.label,
                    snippet: lineText.trim(),
                });
            }
        }
    });
}

const ALLOWED_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".py"];
const SKIP_FOLDERS = ["node_modules", ".git"];

function walk(dirPath) {
    const entries = fs.readdirSync(dirPath);

    for (const entry of entries) {
        if (SKIP_FOLDERS.includes(entry)) {
            continue;
        }

        const fullPath = path.join(dirPath, entry);

        let stats;
        try {
            stats = fs.statSync(fullPath);
        } catch (err) {
            console.warn(`Skipping (could not read): ${fullPath}`);
            continue;
        }

        if (stats.isDirectory()) {
            walk(fullPath);
        } else {
            const ext = path.extname(fullPath);
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                continue;
            }

            try {
                const content = fs.readFileSync(fullPath, "utf-8");

                if (ext === ".py") {
                    scanPythonFileWithRegex(fullPath, content);
                } else {
                    const astFindings = scanJSFileWithAST(fullPath, content);
                    findings.push(...astFindings);
                }
            } catch (err) {
                console.warn(`Skipping (could not read): ${fullPath}`);
            }
        }
    }
}

const targetFolder = process.argv[2] || "./sample-code";

if (!fs.existsSync(targetFolder)) {
    console.error(`Error: The folder "${targetFolder}" does not exist.`);
    console.error(`Tip: run "compilaw --help" for usage instructions.`);
    process.exit(1);
}

const folderStats = fs.statSync(targetFolder);
if (!folderStats.isDirectory()) {
    console.error(`Error: "${targetFolder}" is a file, not a folder. Please point compilaw at a directory.`);
    process.exit(1);
}

console.log(`Scanning folder: ${targetFolder}\n`);

const context = runQuestionnaire();
console.log("\nStarting scan with context:", context, "\n");

walk(targetFolder);

const dependencyResults = scanDependencies(targetFolder);

function buildReport(findings, context, dependencyResults) {
    const grouped = {};

    for (const finding of findings) {
        if (!grouped[finding.category]) {
            grouped[finding.category] = [];
        }
        grouped[finding.category].push(finding);
    }

    let report = "COMPILAW SCAN REPORT\n";
    report += "=====================\n";
    report += "DISCLAIMER: This report is a technical aid, not legal advice. Citations should be verified\n";
    report += "against the official DPDP Act/Rules text and reviewed by a qualified lawyer before acting.\n\n";
    report += `Total findings: ${findings.length}\n\n`;

    const severityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    for (const category in grouped) {
        const rule = DPDP_RULES[category];
        if (rule) {
            severityCounts[rule.severity] += grouped[category].length;
        }
    }
    report += `Severity breakdown — Critical: ${severityCounts.Critical}, High: ${severityCounts.High}, Medium: ${severityCounts.Medium}, Low: ${severityCounts.Low}\n\n`;

    const breachRule = DPDP_RULES["Breach notification (general reminder)"];
    report += `REMINDER — ${breachRule.citation}: ${breachRule.ruleText}\n\n`;

    if (context.handlesMinors) {
        report += "⚠ NOTE: You indicated this product handles minors' data. Every finding below involving names, DOB, or contact fields should be reviewed against DPDP's parental-consent requirements as a priority.\n\n";
    }
    if (context.sector === "fintech") {
        report += "⚠ NOTE: Fintech sector selected — Financial/bank field findings may also be subject to RBI data-localisation and security rules in addition to DPDP.\n\n";
    }
    if (context.sector === "health") {
        report += "⚠ NOTE: Health sector selected — Health field findings should be treated as highly sensitive even though DPDP doesn't formally create a separate sensitive-data category.\n\n";
    }

    for (const category in grouped) {
        const items = grouped[category];
        const rule = DPDP_RULES[category];

        report += `${category} (${items.length} occurrence(s))\n`;
        report += "-".repeat(50) + "\n";

        if (rule) {
            report += `  Severity:     ${rule.severity}\n`;
            report += `  Applicable rule: ${rule.citation}\n`;
            report += `  Rule summary: ${rule.ruleText}\n`;
            report += `  Suggested action: ${rule.remediation}\n`;
        } else {
            report += `  (No matching rule in knowledge base yet)\n`;
        }

        report += `  Found at:\n`;
        for (const item of items) {
            report += `    - ${item.file}:${item.line}  →  ${item.snippet}\n`;
        }
        report += "\n";
    }
    report += "DEPENDENCY & LICENSE SCAN\n";
    report += "=====================\n\n";

    if (dependencyResults.length === 0) {
        report += "No external dependencies found.\n\n";
    } else {
        for (const dep of dependencyResults) {
            const flag = dep.risky ? "⚠ RISKY LICENSE" : "OK";
            report += `  ${dep.name}@${dep.version} — License: ${dep.license} — ${flag}\n`;
        }
        report += "\n";
    }

    return report;
}


const reportText = buildReport(findings, context, dependencyResults);
console.log(reportText);

fs.writeFileSync("./compilaw-report.txt", reportText);
console.log("Report saved to compilaw-report.txt");

const severityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
for (const finding of findings) {
    const rule = DPDP_RULES[finding.category];
    if (rule) {
        severityCounts[rule.severity] += 1;
    }
}

const reportData = {
    generatedAt: new Date().toISOString(),
    scannedFolder: targetFolder,
    businessContext: context,
    totalFindings: findings.length,
    severityBreakdown: severityCounts,
    findings: findings.map((f) => ({
        ...f,
        rule: DPDP_RULES[f.category] || null,
    })),
    dependencies: dependencyResults,
};

fs.writeFileSync("./compilaw-report.json", JSON.stringify(reportData, null, 2));
console.log("Machine-readable report saved to compilaw-report.json");