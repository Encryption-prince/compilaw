#!/usr/bin/env node
const os = require("os");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const { shouldTriageFile } = require("./triage");
const { analyzeFileWithLLM } = require("./ollama-client");
const { resolveLocalImports } = require("./triage");

const { DPDP_RULES } = require("./rules");
const { runQuestionnaire } = require("./questionnaire");
const { scanDependencies } = require("./dependency-scanner");
const { matchPattern } = require("./patterns");
const { scanJSFileWithAST } = require("./ast-scanner");
const { scanPythonFileWithAST, PYTHON_CMD } = require("./python-ast-scanner");
const { loadConfig } = require("./config-loader");

console.log("CompiLaw scanner starting...");

if (process.argv[2] === "--help" || process.argv[2] === "-h") {
    console.log(`
CompiLaw — DPDP compliance gap scanner (V1)

Usage:
  compilaw <folder-path> [flags]

Flags:
  --install-deps   Runs "npm install" in the target folder first, to get accurate
                    dependency license data. SECURITY NOTE: only use this on codebases
                    you trust — it executes that project's install scripts.

Example:
  compilaw ./my-project
  compilaw ./my-project --install-deps

Config:
  Place a .compilawrc.json in the target folder to customize scanning:
    {
      "ignoreFolders": ["scripts", "legacy"],
      "ignoreCategories": ["Address field"]
    }

What it does:
  Scans JS/TS/Python files for PII-shaped fields and data-flow risk (PII
  passed into function/API calls), matches findings against a simplified
  DPDP Act 2023 rules knowledge base, scans dependencies for risky
  open-source licenses, and writes compilaw-report.txt and .json.

This tool is a technical aid, not legal advice.
`);
    process.exit(0);
}

if (process.argv[2] === "--version" || process.argv[2] === "-v") {
    const pkg = require("../package.json");
    console.log(pkg.version);
    process.exit(0);
}

if (!PYTHON_CMD) {
    console.warn("Note: Python not found on PATH — .py files will use regex fallback instead of AST.");
}

const targetFolder = process.argv[2] || "./sample-code";
const installDeps = process.argv.includes("--install-deps");
const deepScan = process.argv.includes("--deep-scan");

if (!fs.existsSync(targetFolder)) {
    console.error(`Error: The folder "${targetFolder}" does not exist.`);
    console.error(`Tip: run "compilaw --help" for usage instructions.`);
    process.exit(1);
}

const folderStats = fs.statSync(targetFolder);
if (!folderStats.isDirectory()) {
    console.error(`Error: "${targetFolder}" is a file, not a folder.`);
    process.exit(1);
}

const config = loadConfig(targetFolder);

const ALLOWED_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".py", ".java"];
const SKIP_FOLDERS = ["node_modules", ".git", ...config.ignoreFolders];
const EXCLUDE_PATTERNS = [/console\.(log|error|warn|info)/i];

const REPORTS_DIR = path.join(os.homedir(), ".compilaw", "reports");
if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
}
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const reportTxtPath = path.join(REPORTS_DIR, `compilaw-report-${timestamp}.txt`);
const reportJsonPath = path.join(REPORTS_DIR, `compilaw-report-${timestamp}.json`);

const findings = [];
let triageQueue = [];
let filesScanned = 0;

function scanFileWithRegex(filePath, content) {
    const lines = content.split("\n");

    lines.forEach((lineText, index) => {
        const lineNumber = index + 1;
        const isExcluded = EXCLUDE_PATTERNS.some((pattern) => pattern.test(lineText));
        if (isExcluded) return;

        const pattern = matchPattern(lineText);
        if (pattern) {
            findings.push({
                file: filePath,
                line: lineNumber,
                category: pattern.label,
                snippet: lineText.trim(),
                confidence: (pattern.confidence || 0.7) * 0.8,
                type: "declaration",
            });
        }
    });
}

function walk(dirPath) {
    const entries = fs.readdirSync(dirPath);

    for (const entry of entries) {
        if (SKIP_FOLDERS.includes(entry)) continue;

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
            if (!ALLOWED_EXTENSIONS.includes(ext)) continue;

            try {
                filesScanned++;
                process.stdout.write(`\rFiles scanned: ${filesScanned}`);

                if (ext === ".py") {
                    const astResult = scanPythonFileWithAST(fullPath);
                    if (astResult !== null) {
                        findings.push(...astResult);
                    } else {
                        const content = fs.readFileSync(fullPath, "utf-8");
                        scanFileWithRegex(fullPath, content);
                    }
                    const pyContent = fs.readFileSync(fullPath, "utf-8");
                    const pyFindingsForFile = astResult || [];
                    const triage = shouldTriageFile(fullPath, pyContent, pyFindingsForFile);
                    if (triage.shouldAnalyze) {
                        triageQueue.push({ file: fullPath, content: pyContent, reasons: triage.reasons });
                    }
                } else if (ext === ".java") {
                    const content = fs.readFileSync(fullPath, "utf-8");
                    scanFileWithRegex(fullPath, content);
                    const triage = shouldTriageFile(fullPath, content, []);
                    if (triage.shouldAnalyze) {
                        triageQueue.push({ file: fullPath, content, reasons: triage.reasons });
                    }
                } else {
                    const content = fs.readFileSync(fullPath, "utf-8");
                    const astFindings = scanJSFileWithAST(fullPath, content);
                    findings.push(...astFindings);
                    const triage = shouldTriageFile(fullPath, content, astFindings);
                    if (triage.shouldAnalyze) {
                        triageQueue.push({ file: fullPath, content, reasons: triage.reasons });
                    }
                }
            } catch (err) {
                console.warn(`Skipping (could not read): ${fullPath}`);
            }
        }
    }
}

console.log(`Scanning folder: ${targetFolder}\n`);

const context = runQuestionnaire();
console.log("\nStarting scan with context:", context, "\n");

async function main() {
    walk(targetFolder);

    if (triageQueue.length > 0) {
        console.log(chalk.cyan(`\n${triageQueue.length} file(s) flagged for deeper semantic analysis:`));
        triageQueue.forEach((t) => console.log(`  - ${t.file} (${t.reasons.join("; ")})`));
    }
    console.log("\n");

    if (deepScan && triageQueue.length > 0) {
        console.log(chalk.cyan(`Running deep semantic analysis on ${triageQueue.length} file(s)...`));
        let llmAddedCount = 0;
        for (const item of triageQueue) {
            const importedContext = resolveLocalImports(item.file, item.content, targetFolder);

            if (process.env.COMPILAW_DEBUG && importedContext.length > 0) {
                console.log(`\n[DEBUG] Resolved ${importedContext.length} import(s) for ${item.file}:`);
                importedContext.forEach((imp) => console.log(`  - ${imp.path} (${imp.content.length} chars)`));
            }
            const llmFindings = await analyzeFileWithLLM(item.file, item.content, importedContext);
            for (const f of llmFindings) {
                const alreadyFound = findings.some((existing) =>
                    existing.file === item.file &&
                    existing.line === f.line &&
                    existing.category === f.category
                );
                if (!alreadyFound) {
                    findings.push({
                        file: item.file,
                        line: f.line || 0,
                        category: f.category,
                        snippet: `${f.name} — ${f.reason} (LLM semantic analysis)`,
                        confidence: 0.65,
                        type: "llm-semantic",
                    });
                    llmAddedCount++;
                }
            }
            process.stdout.write(".");
        }
        console.log(chalk.cyan(` done — ${llmAddedCount} genuinely new finding(s) from LLM analysis (duplicates of existing AST findings were skipped)\n`));
    }

    const filteredFindings = findings.filter((f) => !config.ignoreCategories.includes(f.category));

    const dependencyResults = scanDependencies(targetFolder, installDeps);

    function buildReport(findings, context, dependencyResults) {
        const grouped = {};

        for (const finding of findings) {
            if (!grouped[finding.category]) grouped[finding.category] = [];
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
            if (rule) severityCounts[rule.severity] += grouped[category].length;
        }
        report += `Severity breakdown — Critical: ${severityCounts.Critical}, High: ${severityCounts.High}, Medium: ${severityCounts.Medium}, Low: ${severityCounts.Low}\n\n`;

        const breachRule = DPDP_RULES["Breach notification (general reminder)"];
        report += `REMINDER — ${breachRule.citation}: ${breachRule.ruleText}\n\n`;

        if (context.handlesMinors) {
            report += "⚠ NOTE: Minors' data indicated — review DPDP parental-consent requirements as a priority.\n\n";
        }
        if (context.sector === "fintech") {
            report += "⚠ NOTE: Fintech sector — Financial/bank findings may also face RBI data-localisation rules.\n\n";
        }
        if (context.sector === "health") {
            report += "⚠ NOTE: Health sector — Health findings should be treated as highly sensitive.\n\n";
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
                const confidencePct = Math.round((item.confidence || 0.7) * 100);
                const flowTag =
                    item.type === "data-flow"
                        ? item.externalRisk
                            ? " [DATA FLOW — possible external transmission]"
                            : " [DATA FLOW — internal call]"
                        : "";
                report += `    - ${item.file}:${item.line}  →  ${item.snippet}  (confidence: ${confidencePct}%)${flowTag}\n`;
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

    const reportText = buildReport(filteredFindings, context, dependencyResults);

    const severityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    for (const finding of filteredFindings) {
        const rule = DPDP_RULES[finding.category];
        if (rule) severityCounts[rule.severity] += 1;
    }

    console.log(chalk.bold("Severity summary:"));
    console.log(chalk.red.bold(`  Critical: ${severityCounts.Critical}`));
    console.log(chalk.red(`  High:     ${severityCounts.High}`));
    console.log(chalk.yellow(`  Medium:   ${severityCounts.Medium}`));
    console.log(chalk.gray(`  Low:      ${severityCounts.Low}`));
    console.log("");

    fs.writeFileSync(reportTxtPath, reportText);
    console.log(`Report saved to ${reportTxtPath}`);

    const reportData = {
        generatedAt: new Date().toISOString(),
        scannedFolder: targetFolder,
        businessContext: context,
        totalFindings: filteredFindings.length,
        severityBreakdown: severityCounts,
        findings: filteredFindings.map((f) => ({ ...f, rule: DPDP_RULES[f.category] || null })),
        dependencies: dependencyResults,
    };

    fs.writeFileSync(reportJsonPath, JSON.stringify(reportData, null, 2));
    console.log(`Machine-readable report saved to ${reportJsonPath}`);

    const dashboardUrl = process.argv.includes("--upload") ? "http://localhost:3000/api/report" : null;

    function exitWithResult() {
        if (severityCounts.Critical > 0) {
            console.log(chalk.red.bold("Result: FAIL — Critical severity findings detected."));
            process.exit(1);
        } else if (severityCounts.High > 0) {
            console.log(chalk.yellow.bold("Result: WARN — High severity findings detected."));
            process.exit(0);
        } else {
            console.log(chalk.green.bold("Result: PASS — no Critical findings."));
            process.exit(0);
        }
    }

    if (dashboardUrl) {
        fetch(dashboardUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reportData),
        })
            .then((res) => {
                if (!res.ok) throw new Error(`Server responded ${res.status}`);
                return res.json();
            })
            .then((data) => {
                console.log(chalk.bold(`\nScan complete — ${filteredFindings.length} findings (Critical: ${severityCounts.Critical}, High: ${severityCounts.High}, Medium: ${severityCounts.Medium}, Low: ${severityCounts.Low})`));
                console.log(chalk.green(`✓ Uploaded to dashboard (report #${data.id}) — view details at http://localhost:3000\n`));
                exitWithResult();
            })
            .catch((err) => {
                console.warn(`Could not upload to dashboard: ${err.message}`);
                console.log(reportText); // fall back to full output if upload failed
                exitWithResult();
            });
    } else {
        console.log(reportText);
        exitWithResult();
    }
}

main();