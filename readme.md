# CompiLaw

![Node](https://img.shields.io/badge/node-%3E%3D22.0-339933?logo=node.js&logoColor=white)
![Status](https://img.shields.io/badge/status-V1%20prototype-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)
![Made with](https://img.shields.io/badge/built%20with-JavaScript%20%26%20Python-yellow)

**Automated legal & regulatory gap analysis for codebases.**
*"Where compliance meets the codebase."*

CompiLaw scans a software codebase, traces where personal data actually flows, and matches what it finds against India's **DPDP Act 2023 and DPDP Rules 2025** — producing a severity-ranked gap report with citations, so early-stage teams can spot compliance risk before a lawyer or regulator does.

> ⚠️ **This is not legal advice.** CompiLaw is a technical aid. Every citation should be verified against the official DPDP Act/Rules text and reviewed by a qualified lawyer before you act on it.

---

## What's in this package

CompiLaw installs as a single package with three subcommands:

| Command | What it does |
|---|---|
| `compilaw <folder>` | Scans a codebase and produces a gap report |
| `compilaw setup` | One-time check for Ollama, pulls the local LLM model, checks for Python |
| `compilaw dashboard` | Starts a local web UI to browse scan history, track remediation, export CSV |

Everything — scanner, dashboard, local LLM integration — ships in one install. No separate cloning or setup per component.

---

## Features

- **Real AST-based detection**, not just keyword search — parses actual code structure for JS/TS (via Babel) and Python (via Python's own `ast` module), so a variable named `ipAddress` isn't confused with someone's home address.
- **Optional local LLM semantic analysis** (`--deep-scan`) — runs entirely on your own machine via [Ollama](https://ollama.com), no code ever leaves your computer. Catches personal data that AST can't, since it reads code *meaning*, not just variable names (e.g. `const x = "user@example.com"` gets flagged correctly even though `x` matches no naming pattern). Includes shallow cross-file context (JS/TS only) — if a file imports another local file, that file's content is included so the model can reason about where data ends up (e.g. a function that calls `database.insert(...)`).
- **Data-flow tracing** — detects not just *that* a PII field exists, but when it's passed into a function call that looks like it sends data externally (e.g. `analytics.track(userEmail)`), flagging that as a higher-priority finding.
- **DPDP Act 2023 and DPDP Rules 2025 rule matching**, citations verified directly against the official Gazette text for both — not paraphrased secondary sources. LLM findings are grounded to this same fixed rule set — the model selects among pre-verified categories, it never invents a citation.
- **Confidence scoring** on every finding, so you know which ones are near-certain vs. worth a second look.
- **Business-context questionnaire** (user location, sector, minors' data) that adds targeted warnings — e.g. fintech-specific RBI flags, children's-data parental-consent reminders.
- **Dependency & license scanning** — flags risky copyleft licenses (GPL/AGPL family) in your dependency tree; optional `--install-deps` flag for accurate license data on uninstalled packages (opt-in, since it executes the target project's install scripts).
- **Configurable per-project** via a `.compilawrc.json` file — ignore folders or specific finding categories without touching source code.
- **CI-friendly** — meaningful exit codes (`1` on Critical findings) and colored terminal output.
- **Dual output**: human-readable `.txt` report and machine-readable `.json`, saved to `~/.compilaw/reports/` (never inside the folder you're scanning), or push straight to the dashboard with `--upload`.
- **Dashboard**: scan history, per-finding status tracking (Open / Fixed / Accepted Risk / Needs Lawyer Review), CSV export for sharing with counsel, AST vs. LLM provenance badges. Runs locally, binds to `localhost` only — nothing leaves your machine.

---

## Understanding confidence scores

Every finding carries a confidence score (0–100%) reflecting how likely it is to be a genuine compliance-relevant match, not a false positive.

| Score range | Meaning | Example |
|---|---|---|
| **85–90%** | Very reliable — this category is rarely a false positive | `password`, `dateOfBirth`, `aadhaar` |
| **70–84%** | Reliable, but some ambiguity possible | `email`, `phone`, `latitude` |
| **65%** | LLM semantic finding (`--deep-scan`) — caught by meaning, not name, but non-deterministic and heuristic | `const x = "user@example.com"` |
| **55–69%** | Moderate — worth a manual look, more prone to false matches | `fullName`, `address` (network-address terms are filtered, but ambiguity remains), `health` |
| **50–54%** | Data-flow findings (a PII variable passed into a function call) | Heuristic — guesses whether a call looks "external" (e.g. `analytics.track()`) based on the function name, not certainty |

**Rule of thumb:** treat anything under 70% as a prompt to check the actual code, not as a confirmed issue. Regex-fallback findings (used when AST parsing isn't available, e.g. Python without an installed interpreter) are automatically scored 20% lower than the same category detected via AST, since fallback matching is line-based text search, not real code structure.

---

## Setup

### Prerequisites
- Node.js 22+ (built-in `node:sqlite` support requires this)
- Python 3 (optional — enables real AST parsing for `.py` files; falls back to regex matching if not found)
- [Ollama](https://ollama.com/download) (optional — only needed for `--deep-scan`; must be installed manually, one time)

### Install

```bash
npm install -g compilaw
compilaw setup
```

`compilaw setup` checks whether Ollama is running, automatically pulls the model it needs (`qwen2.5-coder:7b`, a few GB — one-time download), and checks for Python. If Ollama isn't installed yet, it prints a download link and instructions rather than failing — you only need `--deep-scan` if you actually want the local LLM pass; everything else works without it.

That's it — no cloning, no separate dashboard install.

---

## Usage

```bash
# Scan a folder, print a full report to the terminal
compilaw <folder-path>

# Scan with local LLM semantic analysis (requires Ollama + setup above)
compilaw <folder-path> --deep-scan

# Scan and push the report to the dashboard instead of printing everything
compilaw <folder-path> --upload

# Scan and also get accurate dependency license data (only on trusted code —
# this runs "npm install" in the target folder)
compilaw <folder-path> --install-deps

# Start the local dashboard (run from anywhere)
compilaw dashboard

# Usage help
compilaw --help
```

Flags can be combined:

```bash
compilaw ./my-project --deep-scan --upload
```

### Example
Scan complete — 9 findings (Critical: 0, High: 7, Medium: 2, Low: 0)
✓ Uploaded to dashboard (report #3) — view details at http://localhost:3000

---

## Configuration

Place a file named exactly `.compilawrc.json` **inside the folder you're scanning** (not wherever CompiLaw itself is installed). CompiLaw reads it automatically — no flag needed.

If no config file is found, CompiLaw scans everything with no exclusions (the default).

### Full example

```json
{
  "ignoreFolders": ["scripts", "legacy", "vendor"],
  "ignoreCategories": ["Address field", "Health field"]
}
```

### Options

| Key | Type | Default | What it does |
|---|---|---|---|
| `ignoreFolders` | array of strings | `[]` | Folder *names* (not paths) to skip entirely during the scan, in addition to the always-skipped `node_modules` and `.git`. Matches by exact folder name at any depth. |
| `ignoreCategories` | array of strings | `[]` | Finding categories to exclude from the final report entirely. Must exactly match a category name — see the full list below. |

### Valid category names for `ignoreCategories`
Email field
Phone number field
Full name field
Date of birth field
Address field
Government ID field
Password field
Financial/bank field
Health field
Biometric field
Location field

### Common setup mistakes

- **Wrong location** — the file must be inside the *target* folder you're scanning (e.g. `./my-project/.compilawrc.json`), not wherever CompiLaw is installed.
- **Hidden file-extension issue on Windows** — when creating the file, double check it's not accidentally saved as `.compilawrc.json.txt`. Windows Explorer sometimes hides extensions by default; VS Code's file explorer shows the true name and is the more reliable place to check.
- **Invalid JSON** — if the file can't be parsed, CompiLaw prints a warning and falls back to scanning with no exclusions, rather than failing the whole scan.

---

## Known limitations (honest, by design)

- **Name-based AST detection has real limits** even with the exclusion filtering built in — `--deep-scan` closes some of this gap but is non-deterministic and slower.
- **LLM cross-file context is JS/TS only** — Python files don't yet get imported-file context, even with `--deep-scan` on.
- **Data-flow tracing is single-file only** for both AST and LLM passes — it won't follow a variable into a function defined in a completely separate module chain beyond one level of local imports.
- **Dependency scanning** reads the target folder's own `package.json`/`node_modules`; use `--install-deps` for accurate license data on packages not already installed there.
- **The DPDP knowledge base is a simplified starting point**, verified against primary Gazette text but not a substitute for a lawyer's review of your specific business.
- **No login/auth on the dashboard** — by design, since it's meant to run locally, bound to `localhost` only. Don't expose it to a network or the internet without adding proper authentication first.

---

## Troubleshooting

**`compilaw setup` says Ollama isn't detected**
Install it from [ollama.com/download](https://ollama.com/download), make sure it's running (check your system tray), then re-run `compilaw setup`.

**`--deep-scan` runs but finds nothing new / seems to hang**
The first run after `compilaw setup` can be slow while the model loads into GPU memory. Subsequent runs are faster. If it hangs indefinitely, confirm Ollama is running: `curl http://localhost:11434/api/tags`.

**Python files fall back to regex instead of AST parsing**
CompiLaw looks for `python3` or `python` on your system PATH. If neither is found, `.py` files use the regex fallback automatically — not an error, just reduced accuracy for Python specifically.

**`compilaw dashboard` shows an `ExperimentalWarning: SQLite is an experimental feature` message**
Expected and harmless — CompiLaw uses Node's built-in `node:sqlite`, still marked experimental as of Node 22.x but stable enough for this use case.

**CLI reports "Could not upload to dashboard"**
The dashboard isn't running. Start it with `compilaw dashboard` in another terminal before using `--upload`. If upload fails, CompiLaw automatically falls back to printing the full report instead of losing results.

---

## Roadmap

- [ ] Cross-file data-flow tracing beyond one import level, and for Python
- [ ] GDPR and other jurisdiction modules
- [ ] GitHub App integration (auto-scan on PRs)
- [ ] Sector-specific overlays (RBI for fintech, health-data rules)
- [ ] Multi-user support for the dashboard, if this ever moves beyond local/personal use

---

## Disclaimer

CompiLaw does not provide legal advice. All legal content is intended for technical triage only and must be reviewed by a qualified legal professional before being relied upon.

## License

MIT