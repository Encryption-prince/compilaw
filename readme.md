# CompiLaw

![Node](https://img.shields.io/badge/node-%3E%3D22.0-339933?logo=node.js&logoColor=white)
![Status](https://img.shields.io/badge/status-V1%20prototype-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)
![Made with](https://img.shields.io/badge/built%20with-JavaScript%20%26%20Python-yellow)

**Automated legal & regulatory gap analysis for codebases.**
*"Where compliance meets the codebase."*

CompiLaw scans a software codebase, traces where personal data actually flows, and matches what it finds against India's DPDP Act 2023 — producing a severity-ranked gap report with citations, so early-stage teams can spot compliance risk before a lawyer or regulator does.

> ⚠️ **This is not legal advice.** CompiLaw is a technical aid. Every citation should be verified against the official DPDP Act/Rules text and reviewed by a qualified lawyer before you act on it.

---

## What's in this repo

CompiLaw is two cooperating pieces:

| Component | Folder | What it does |
|---|---|---|
| **CLI scanner** | `/` (root) | Scans your codebase, detects PII fields and data flows, matches DPDP rules, outputs reports |
| **Web dashboard** | `/compilaw-dashboard` | Local web UI to browse scan history, track remediation status, and export findings as CSV |

The dashboard is optional — the CLI works completely standalone.

---

## Features

- **Real AST-based detection**, not just keyword search — parses actual code structure for JS/TS (via Babel) and Python (via Python's own `ast` module), so a variable named `ipAddress` isn't confused with someone's home address.
- **Data-flow tracing** — detects not just *that* a PII field exists, but when it's passed into a function call that looks like it sends data externally (e.g. `analytics.track(userEmail)`), flagging that as a higher-priority finding.
- **DPDP Act 2023 rule matching**, citations verified directly against the official Gazette text (Act + DPDP Rules 2025) — not paraphrased secondary sources.
- **Confidence scoring** on every finding, so you know which ones are near-certain vs. worth a second look.
- **Business-context questionnaire** (user location, sector, minors' data) that adds targeted warnings — e.g. fintech-specific RBI flags, children's-data parental-consent reminders.
- **Dependency & license scanning** — flags risky copyleft licenses (GPL/AGPL family) in your dependency tree; optional `--install-deps` flag for accurate license data on uninstalled packages (opt-in, since it executes the target project's install scripts).
- **Configurable per-project** via a `.compilawrc.json` file — ignore folders or specific finding categories without touching source code.
- **CI-friendly** — meaningful exit codes (`1` on Critical findings) and colored terminal output.
- **Dual output**: human-readable `.txt` report and machine-readable `.json`, or push straight to the dashboard with `--upload`.
- **Dashboard**: scan history, per-finding status tracking (Open / Fixed / Accepted Risk / Needs Lawyer Review), CSV export for sharing with counsel. Runs locally, binds to `localhost` only — nothing leaves your machine.

---

## Setup

### Prerequisites
- Node.js 22+ (built-in `node:sqlite` support requires this)
- Python 3 (optional — enables real AST parsing for `.py` files; falls back to regex matching if not found)

### 1. CLI scanner

```bash
npm install
npm link
```

This installs `compilaw` as a global command on your machine, backed by this project folder.

### 2. Web dashboard (optional)

```bash
cd compilaw-dashboard
npm install
node server.js
```

Visit `http://localhost:3000`.

---

## Usage

```bash
# Scan a folder, print a full report to the terminal
compilaw <folder-path>

# Scan and push the report to the dashboard instead of printing everything
compilaw <folder-path> --upload

# Scan and also get accurate dependency license data (only on trusted code —
# this runs "npm install" in the target folder)
compilaw <folder-path> --install-deps

# Usage help
compilaw --help
```

### Example

```bash
compilaw ./my-project --upload
```