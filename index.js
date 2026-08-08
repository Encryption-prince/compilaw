#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { DPDP_RULES } = require("./rules");

console.log("CompiLaw scanner starting...");

// Each entry: a human-readable label, and a regex that matches related code.
const PII_PATTERNS = [
    { label: "Email field", regex: /email/i },
    { label: "Phone number field", regex: /phone|mobile/i },
    { label: "Full name field", regex: /fullname|full_name|username/i },
    { label: "Date of birth field", regex: /dob|dateofbirth|date_of_birth/i },
    { label: "Address field", regex: /address/i },
    { label: "Government ID field", regex: /aadhaar|aadhar|pan\b|passport/i },
];

const findings = [];

function scanFileForPII(filePath, content) {
    const lines = content.split("\n");

    lines.forEach((lineText, index) => {
        const lineNumber = index + 1;

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

function walk(dirPath) {
    const entries = fs.readdirSync(dirPath);

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            walk(fullPath);
        } else {
            const content = fs.readFileSync(fullPath, "utf-8");
            scanFileForPII(fullPath, content);
        }
    }
}

const targetFolder = process.argv[2] || "./sample-code";

console.log(`Scanning folder: ${targetFolder}\n`);

walk(targetFolder);

function buildReport(findings) {
    const grouped = {};

    for (const finding of findings) {
        if (!grouped[finding.category]) {
            grouped[finding.category] = [];
        }
        grouped[finding.category].push(finding);
    }

    let report = "COMPILAW SCAN REPORT\n";
    report += "=====================\n\n";
    report += `Total findings: ${findings.length}\n\n`;

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

    return report;
}


const reportText = buildReport(findings);
console.log(reportText);

fs.writeFileSync("./compilaw-report.txt", reportText);
console.log("Report saved to compilaw-report.txt");