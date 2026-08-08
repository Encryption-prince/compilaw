# CompiLaw (V1 — CLI prototype)

A command-line tool that scans a codebase for PII-shaped data fields and
matches findings against a simplified knowledge base of DPDP Act 2023
obligations — producing a gap report to help early-stage teams spot
compliance risk before a lawyer or regulator does.

**This is not legal advice.** All citations should be verified against the
official DPDP Act/Rules text and reviewed by a qualified lawyer.

## Install (local development)

```bash
npm install
npm link
```

## Usage

```bash
compilaw <folder-path>
compilaw --help
```

## What it does

- Recursively scans `.js`, `.jsx`, `.ts`, `.tsx`, `.py` files (skips `node_modules`, `.git`)
- Flags PII-shaped fields: email, phone, name, DOB, address, government ID,
  password, financial, health, biometric, and location data
- Matches each finding to a DPDP Act 2023 rule with citation, severity, and
  suggested remediation
- Asks a short questionnaire (user location, sector, minors' data) to add
  contextual warnings
- Scans `package.json` dependencies for risky open-source licenses (GPL/AGPL family)
- Outputs both `compilaw-report.txt` (human-readable) and
  `compilaw-report.json` (machine-readable)

## Known limitations (honest, by design)

- Detection is regex/keyword-based, not true code-structure (AST) analysis —
  it can produce false positives (e.g., a variable named similarly to a
  flagged term but unrelated to real data collection).
- The DPDP rules knowledge base is simplified and for learning purposes —
  not a substitute for legal review.
- Currently supports JS/TS/Python file scanning only.

## Roadmap

- AST-based parsing to reduce false positives
- Broader jurisdiction support (GDPR, etc.)
- Web dashboard for report viewing and remediation tracking
- GitHub App integration for automatic PR scanning