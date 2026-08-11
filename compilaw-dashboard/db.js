const { DatabaseSync } = require("node:sqlite");

const db = new DatabaseSync("compilaw.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scanned_folder TEXT,
    generated_at TEXT,
    total_findings INTEGER,
    critical INTEGER,
    high INTEGER,
    medium INTEGER,
    low INTEGER,
    raw_json TEXT
  );

  CREATE TABLE IF NOT EXISTS findings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER,
    file TEXT,
    line INTEGER,
    category TEXT,
    snippet TEXT,
    severity TEXT,
    citation TEXT,
    rule_text TEXT,
    remediation TEXT,
    confidence REAL,
    source TEXT DEFAULT 'ast',
    status TEXT DEFAULT 'Open',
    FOREIGN KEY (report_id) REFERENCES reports(id)
  );
`);

function insertReport(reportData) {
  const insertReportStmt = db.prepare(`
    INSERT INTO reports (scanned_folder, generated_at, total_findings, critical, high, medium, low, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insertReportStmt.run(
    reportData.scannedFolder,
    reportData.generatedAt,
    reportData.totalFindings,
    reportData.severityBreakdown.Critical,
    reportData.severityBreakdown.High,
    reportData.severityBreakdown.Medium,
    reportData.severityBreakdown.Low,
    JSON.stringify(reportData)
  );

  const reportId = result.lastInsertRowid;

  const insertFindingStmt = db.prepare(`
    INSERT INTO findings (report_id, file, line, category, snippet, severity, citation, rule_text, remediation, confidence, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const f of reportData.findings) {
    insertFindingStmt.run(
      reportId,
      f.file,
      f.line,
      f.category,
      f.snippet,
      f.rule ? f.rule.severity : "Low",
      f.rule ? f.rule.citation : null,
      f.rule ? f.rule.ruleText : null,
      f.rule ? f.rule.remediation : null,
      f.confidence || null,
      f.type === "llm-semantic" ? "llm" : "ast"
    );
  }

  return reportId;
}

function getAllReports() {
  return db.prepare("SELECT id, scanned_folder, generated_at, total_findings, critical, high, medium, low FROM reports ORDER BY id DESC").all();
}

function getReportById(id) {
  const report = db.prepare("SELECT * FROM reports WHERE id = ?").get(id);
  if (!report) return null;
  const findings = db.prepare("SELECT * FROM findings WHERE report_id = ?").all(id);
  return { ...report, findings };
}

function updateFindingStatus(id, status) {
  db.prepare("UPDATE findings SET status = ? WHERE id = ?").run(status, id);
}

module.exports = { insertReport, getAllReports, getReportById, updateFindingStatus };