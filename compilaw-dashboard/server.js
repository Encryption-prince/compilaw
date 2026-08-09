const express = require("express");
const { insertReport, getAllReports, getReportById, updateFindingStatus } = require("./db");

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));
app.use(express.static("public"));

app.post("/api/report", (req, res) => {
    const id = insertReport(req.body);
    res.json({ status: "ok", id });
});

app.get("/api/reports", (req, res) => {
    res.json(getAllReports());
});

app.get("/api/reports/:id", (req, res) => {
    const report = getReportById(req.params.id);
    if (!report) return res.status(404).json({ error: "Not found" });
    res.json(report);
});

app.listen(PORT, "127.0.0.1", () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

app.patch("/api/findings/:id", (req, res) => {
    const { status } = req.body;
    const validStatuses = ["Open", "Fixed", "Accepted Risk", "Needs Lawyer Review"];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }

    const { updateFindingStatus } = require("./db");
    updateFindingStatus(req.params.id, status);
    res.json({ status: "ok" });
});

app.get("/api/reports/:id/csv", (req, res) => {
    const report = getReportById(req.params.id);
    if (!report) return res.status(404).send("Not found");

    let csv = "File,Line,Category,Severity,Citation,Status,Snippet\n";
    for (const f of report.findings) {
        const row = [f.file, f.line, f.category, f.severity, f.citation || "", f.status, f.snippet]
            .map((val) => `"${String(val).replace(/"/g, '""')}"`)
            .join(",");
        csv += row + "\n";
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="compilaw-report-${req.params.id}.csv"`);
    res.send(csv);
});