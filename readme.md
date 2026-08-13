# CompiLaw

![Node](https://img.shields.io/badge/node-%3E%3D22.0-339933?logo=node.js&logoColor=white)
![npm](https://img.shields.io/npm/v/compilaw?color=cb3837&logo=npm)
![Status](https://img.shields.io/badge/status-V1-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

**Automated legal & regulatory gap analysis for codebases.**  
*"Where compliance meets the codebase."*

CompiLaw scans a software codebase, traces where personal data actually flows, and matches what it finds against India's **DPDP Act 2023 and DPDP Rules 2025** — producing a severity-ranked gap report with citations, so engineering teams can spot compliance risk before a lawyer or regulator does.

> ⚠️ **This is not legal advice.** CompiLaw is a technical aid. Every citation should be verified against the official DPDP Act/Rules text and reviewed by a qualified lawyer before you act on it.

---

## Install

```bash
npm install -g compilaw@latest
compilaw setup
```

`compilaw setup` checks whether Ollama is running, automatically pulls the LLM model it needs (`qwen2.5-coder:7b` — one-time download, a few GB), and checks for Python. Everything else works without Ollama — you only need it for `--deep-scan`.

---

## What's in this package

CompiLaw installs as a single package with three subcommands:

| Command | What it does |
|---|---|
| `compilaw <folder>` | Scans a codebase and produces a gap report |
| `compilaw setup` | One-time check for Ollama, pulls the local LLM model, checks for Python |
| `compilaw dashboard` | Starts a local web UI to browse scan history, track remediation, export CSV |

---

## Features

### PII detection (AST-based, not keyword search)
Parses actual code structure for JS/TS (via Babel) and Python (via Python's own `ast` module). Detects PII across 15 categories including:

- Contact & identity: email, phone, full name, date of birth, address
- Government IDs: Aadhaar, PAN, passport, voter ID, driving licence, tax ID
- Credentials: password, auth tokens, API keys, session IDs
- Financial: bank account, IFSC, card number, CVV, UPI, IBAN
- Health, biometrics, location, device identifiers, demographics, employment

### Deep data-flow tracking
Not just *that* a PII field exists — but *where it goes*:
- **Destructuring**: `const { email, phone } = req.body`
- **Object spreads**: `sendgrid.send({ ...userData })` — tracks PII carried inside objects
- **PII in HTTP responses**: `res.json(user)` flagged for response filtering
- **PII in logs**: `console.log(email)` is a finding — one of the most common real-world leaks
- **Destructured function params**: `function save({ email, phone }) {}`

### Consent surface detection (new)
After scanning, CompiLaw checks whether the codebase has any consent mechanism at all. If it finds PII collection but zero consent surface — that's a **Critical** finding. Also checks for notice-before-consent (DPDP Section 5 requires notice to precede consent).

### Infrastructure & config scanning (new)
Seven infrastructure checks that run on every JS/TS file:

| Check | Severity |
|---|---|
| Cookie without `httpOnly: true` | High |
| Cookie without `secure: true` | High |
| Cookie without `sameSite` | Medium |
| Database connection without SSL/TLS | Critical |
| Hardcoded secret or credential in source | Critical |
| PII passed directly to `console.log/error` | High |
| Auth route without rate limiting | High |
| No data retention/expiry scheduling | Medium |
| Wildcard CORS (`origin: '*'`) | Medium |

### Optional local LLM semantic analysis (`--deep-scan`)
Runs entirely on your own machine via [Ollama](https://ollama.com) — no code ever leaves your computer. Catches personal data that AST can't, because it reads code *meaning*, not just variable names. Includes shallow cross-file context for JS/TS — if a file imports another local file, that content is included so the model can reason about where data ends up. LLM findings are deduplicated against AST results and marked with an `LLM` badge in the dashboard.

### DPDP Act 2023 & Rules 2025 rule matching
Citations verified directly against the official Gazette text. Every finding maps to a specific Act section and Rule with plain-English summary and a concrete remediation step. The LLM is grounded to this same fixed rule set — it never invents a citation.

### Other
- **Confidence scoring** on every finding (50–90%)
- **Business-context questionnaire** — adds targeted warnings for fintech (RBI flags), health sector, and minors' data (parental consent)
- **Dependency & license scanning** — flags risky copyleft licenses (GPL/AGPL family)
- **CI-friendly** — exit code `1` on Critical findings, `0` otherwise
- **Configurable** via `.compilawrc.json` in the target folder
- **Timestamped reports** saved to `~/.compilaw/reports/` — never inside the scanned folder

---

## Usage

```bash
# Scan a folder
compilaw <folder-path>

# Scan with local LLM semantic analysis (requires Ollama + compilaw setup)
compilaw <folder-path> --deep-scan

# Scan and push results to the dashboard
compilaw <folder-path> --upload

# Scan and install dependencies first for accurate license data
# (only use on code you trust — this runs npm install in the target folder)
compilaw <folder-path> --install-deps

# Start the local dashboard
compilaw dashboard

# Run first-time setup (Ollama, model pull, Python check)
compilaw setup

# Help
compilaw --help
```

Flags can be combined:

```bash
compilaw ./my-project --deep-scan --upload
```

### Example output

```
Scan complete — 23 findings (Critical: 6, High: 12, Medium: 5, Low: 0)
✓ Uploaded to dashboard (report #3) — view details at http://localhost:3000
```

---

## Dashboard

Start it with `compilaw dashboard`, then open `http://localhost:3000`.

- Browse scan history
- Per-finding status tracking: **Open**, **Fixed**, **Accepted Risk**, **Needs Lawyer Review**
- Filter findings by severity
- Rule text and remediation shown inline on each finding
- `LLM` badge on findings detected by the local model
- CSV export (includes Description and Suggested Action columns for sharing with counsel)

The dashboard binds to `localhost` only — nothing leaves your machine.

---

## Understanding confidence scores

| Score | Meaning | Example |
|---|---|---|
| **85–90%** | Very reliable | `password`, `aadhaar`, `dateOfBirth` |
| **70–84%** | Reliable, some ambiguity possible | `email`, `phone`, `latitude` |
| **75%** | Config/infrastructure risk (pattern-matched) | Hardcoded secret, insecure cookie |
| **65%** | LLM semantic finding — caught by meaning, not name | `const x = "user@example.com"` |
| **55–69%** | Moderate — worth a manual check | `fullName`, `address`, `health` |
| **50–54%** | Data-flow heuristic | PII variable passed into a suspicious call |

Treat anything under 70% as a prompt to check the actual code, not a confirmed issue. Regex-fallback findings (used when AST parsing isn't available) are scored 20% lower than the AST equivalent.

---

## Configuration

Place `.compilawrc.json` **inside the folder you're scanning**:

```json
{
  "ignoreFolders": ["scripts", "legacy", "vendor"],
  "ignoreCategories": ["Address field", "Health field"]
}
```

| Key | Type | Default | What it does |
|---|---|---|---|
| `ignoreFolders` | string[] | `[]` | Folder names to skip at any depth (in addition to `node_modules` and `.git`) |
| `ignoreCategories` | string[] | `[]` | Finding categories to exclude from the final report |

### Valid `ignoreCategories` values

```
Email field               Phone number field        Full name field
Date of birth field       Address field             Government ID field
Password field            Auth token field          Financial/bank field
Health field              Biometric field           Location field
Device identifier field   Employment field          Demographic field
Missing consent mechanism Insecure cookie configuration
Unencrypted database connection   Hardcoded secret / credential
PII in error logs         Missing rate limiting on auth endpoint
No data retention policy detected  Overly permissive CORS
```

---

## Prerequisites

- **Node.js 22+** — required (uses built-in `node:sqlite`)
- **Python 3** — optional, enables real AST parsing for `.py` files; falls back to regex if not found
- **[Ollama](https://ollama.com/download)** — optional, only needed for `--deep-scan`

---

## Known limitations

- **Name-based detection has limits** — `--deep-scan` closes some of this gap but is non-deterministic
- **LLM cross-file context is JS/TS only** — Python files don't get imported-file context
- **Data-flow tracing is single-file** — won't follow a variable across more than one level of local imports
- **Dependency scanning** reads the target folder's own `package.json` / `node_modules`
- **No auth on the dashboard** — by design, local only; don't expose it to a network without adding authentication
- **DPDP knowledge base is a simplified starting point** — verified against primary Gazette text but not a substitute for legal review

---

## Troubleshooting

**`compilaw setup` says Ollama isn't detected**  
Install from [ollama.com/download](https://ollama.com/download), make sure it's running, then re-run `compilaw setup`.

**`--deep-scan` seems to hang**  
First run after setup can be slow while the model loads into GPU/CPU memory. Confirm Ollama is running: `curl http://localhost:11434/api/tags`.

**Python files use regex fallback instead of AST**  
CompiLaw looks for `python3` or `python` on PATH. If neither is found, `.py` files fall back to regex automatically — not an error.

**`ExperimentalWarning: SQLite is an experimental feature`**  
Expected and harmless — uses Node's built-in `node:sqlite`, still marked experimental in Node 22.x.

**"Could not upload to dashboard"**  
The dashboard isn't running. Start it with `compilaw dashboard` in another terminal first. If upload fails, CompiLaw prints the full report as a fallback.

---

## Roadmap

- [ ] Cross-file data-flow tracing beyond one import level, and for Python
- [ ] GDPR and other jurisdiction modules
- [ ] GitHub App integration (auto-scan on PRs)
- [ ] Sector-specific overlays (RBI for fintech, health-data rules)
- [ ] Multi-user dashboard support

---

## Disclaimer

CompiLaw does not provide legal advice. All legal content is intended for technical triage only and must be reviewed by a qualified legal professional before being relied upon.

## License

MIT
