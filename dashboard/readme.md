# CompiLaw Dashboard

A local web dashboard for viewing and tracking CompiLaw CLI scan results over time.

Runs entirely on your own machine — binds to localhost only, no login required,
no data leaves your computer.

## Setup

\`\`\`bash
npm install
node server.js
\`\`\`

Visit http://localhost:3000

## Usage

Run scans from the CompiLaw CLI with the \`--upload\` flag while this server is running:

```bash
compilaw ./my-project --upload
```

Each scan appears in the dashboard's history. Click a report to view findings,
mark them Open / Fixed / Accepted Risk / Needs Lawyer Review, and export as CSV
to share with counsel.