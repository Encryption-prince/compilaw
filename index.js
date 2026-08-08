#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { DPDP_RULES } = require("./rules");
const { runQuestionnaire } = require("./questionnaire");

console.log("CompiLaw scanner starting...");

// Each entry: a human-readable label, and a regex that matches related code.
const PII_PATTERNS = [
    { label: "Email field", regex: /email/i },
    { label: "Phone number field", regex: /phone|mobile/i },
    { label: "Full name field", regex: /fullname|full_name|username/i },
    { label: "Date of birth field", regex: /dob|dateofbirth|date_of_birth/i },
    { label: "Address field", regex: /address/i },
    { label: "Government ID field", regex: /aadhaar|aadhar|pan\b|passport/i },
    { label: "Password field", regex: /password|passwd/i },
    { label: "Financial/bank field", regex: /bankaccount|ifsc|accountnumber|cardnumber/i },
    { label: "Health field", regex: /health|medical|diagnosis/i },
    { label: "Biometric field", regex: /biometric|fingerprint|faceid/i },
    { label: "Location field", regex: /latitude|longitude|geolocation/i },
];

const findings = [];

const EXCLUDE_PATTERNS = [
    /console\.(log|error|warn|info)/i,
];

function scanFileForPII(filePath, content) {
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
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            walk(fullPath);
        } else {
            const ext = path.extname(fullPath);
            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                continue;
            }
            const content = fs.readFileSync(fullPath, "utf-8");
            scanFileForPII(fullPath, content);
        }
    }
}

const targetFolder = process.argv[2] || "./sample-code";

console.log(`Scanning folder: ${targetFolder}\n`);

const context = runQuestionnaire();
console.log("\nStarting scan with context:", context, "\n");

walk(targetFolder);

function buildReport(findings, context) {
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

    const severityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    for (const category in grouped) {
        const rule = DPDP_RULES[category];
        if (rule) {
            severityCounts[rule.severity] += grouped[category].length;
        }
    }
    report += `Severity breakdown — Critical: ${severityCounts.Critical}, High: ${severityCounts.High}, Medium: ${severityCounts.Medium}, Low: ${severityCounts.Low}\n\n`;

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

    return report;
}


const reportText = buildReport(findings, context);
console.log(reportText);

fs.writeFileSync("./compilaw-report.txt", reportText);
console.log("Report saved to compilaw-report.txt");