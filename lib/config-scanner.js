// config-scanner.js
// Scans infrastructure and config patterns that indicate DPDP compliance risks:
// - Cookies without httpOnly/Secure
// - DB connections without SSL
// - PII fields appearing in log calls
// - Hardcoded secrets / connection strings
// - Missing rate limiting on auth routes
// - Env vars that suggest unencrypted storage

const fs = require("fs");
const path = require("path");

const CHECKS = [
    // ── Cookie security ────────────────────────────────────────────────────
    {
        id: "cookie-no-httponly",
        category: "Insecure cookie configuration",
        severity: "High",
        pattern: /res\.cookie\s*\(|cookie\s*:\s*\{/i,
        antiPattern: /httpOnly\s*:\s*true/i,
        snippet: (m) => `Cookie set without httpOnly: true — session cookies accessible to JS`,
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        remediation: "Set httpOnly: true on all session/auth cookies to prevent XSS-based session theft.",
    },
    {
        id: "cookie-no-secure",
        category: "Insecure cookie configuration",
        severity: "High",
        pattern: /res\.cookie\s*\(|cookie\s*:\s*\{/i,
        antiPattern: /secure\s*:\s*true/i,
        snippet: () => `Cookie set without secure: true — transmitted over plain HTTP`,
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        remediation: "Set secure: true on all cookies containing session or auth data.",
    },
    {
        id: "cookie-no-samesite",
        category: "Insecure cookie configuration",
        severity: "Medium",
        pattern: /res\.cookie\s*\(/i,
        antiPattern: /sameSite/i,
        snippet: () => `Cookie set without sameSite — CSRF risk`,
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        remediation: "Add sameSite: 'strict' or 'lax' to prevent cross-site request forgery.",
    },

    // ── Database / storage ────────────────────────────────────────────────
    {
        id: "db-no-ssl",
        category: "Unencrypted database connection",
        severity: "Critical",
        pattern: /mongoose\.connect\(|new\s+pg\.Pool|createConnection\(|mysql\.createConnection/i,
        antiPattern: /ssl\s*:|tls\s*:|sslmode|rejectUnauthorized/i,
        snippet: () => `Database connection without SSL/TLS options — data in transit may be unencrypted`,
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        remediation: "Add ssl: { rejectUnauthorized: true } (or equivalent) to all database connection configs.",
    },
    {
        id: "hardcoded-secret",
        category: "Hardcoded secret / credential",
        severity: "Critical",
        pattern: /(password|secret|api.?key|token|private.?key)\s*[:=]\s*["'][^"']{6,}/i,
        antiPattern: /process\.env|os\.environ|\$\{/i,
        snippet: (m) => `Possible hardcoded credential — value should come from environment variable`,
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        remediation: "Move secrets to environment variables or a secrets manager. Never commit credentials to source control.",
    },

    // ── Logging risks ─────────────────────────────────────────────────────
    {
        id: "pii-in-error-log",
        category: "PII in error logs",
        severity: "High",
        pattern: /console\.(error|log|warn)\s*\([^)]*(?:email|password|phone|aadhaar|pan|token|secret)[^)]*\)/i,
        antiPattern: null, // always flag
        snippet: () => `PII or credential passed directly to console — may appear in log aggregators`,
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        remediation: "Strip or mask PII before logging. Use structured logging with field redaction.",
    },

    // ── Auth / rate limiting ───────────────────────────────────────────────
    {
        id: "no-rate-limit-login",
        category: "Missing rate limiting on auth endpoint",
        severity: "High",
        pattern: /router\.(post|put)\s*\(\s*["']\/?(login|signin|auth|token|password)[^"']*["']/i,
        antiPattern: /rateLimit|throttle|express-rate-limit|slowDown/i,
        snippet: () => `Auth route without visible rate limiting — brute-force / credential stuffing risk`,
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        remediation: "Apply express-rate-limit or equivalent middleware to all auth endpoints.",
    },

    // ── Retention ─────────────────────────────────────────────────────────
    {
        id: "no-retention-policy",
        category: "No data retention policy detected",
        severity: "Medium",
        pattern: /deleteMany\(|deleteOne\(|\.destroy\(|\.delete\(/i,
        antiPattern: /retention|expir|ttl|purge|cleanup|schedule|cron/i,
        snippet: () => `Deletion calls found but no retention/expiry scheduling pattern detected`,
        citation: "DPDP Act 2023, Section 8(3) — storage limitation",
        remediation: "Implement automated data purge jobs tied to retention policy. Document retention periods.",
    },

    // ── CORS ──────────────────────────────────────────────────────────────
    {
        id: "cors-wildcard",
        category: "Overly permissive CORS",
        severity: "Medium",
        pattern: /cors\s*\(\s*\{[^}]*origin\s*:\s*["']\*["']/i,
        antiPattern: null,
        snippet: () => `CORS origin set to '*' — any domain can make credentialed requests`,
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        remediation: "Restrict CORS origin to your known frontend domain(s). Never use '*' with credentials.",
    },
];

function scanConfigPatterns(filePath, content) {
    const findings = [];
    const lines = content.split("\n");

    for (const check of CHECKS) {
        // Skip if primary pattern doesn't match the file at all
        if (!check.pattern.test(content)) continue;
        // Skip if the anti-pattern (the fix) is already present
        if (check.antiPattern && check.antiPattern.test(content)) continue;

        // Find the first matching line for a useful line number
        let matchLine = 0;
        for (let i = 0; i < lines.length; i++) {
            if (check.pattern.test(lines[i])) {
                matchLine = i + 1;
                break;
            }
        }

        findings.push({
            file: filePath,
            line: matchLine,
            category: check.category,
            snippet: check.snippet(content.match(check.pattern)?.[0] || ""),
            confidence: 0.75,
            type: "config-risk",
            subtype: check.id,
            externalRisk: ["Critical", "High"].includes(check.severity),
            rule: {
                severity: check.severity,
                citation: check.citation,
                ruleText: check.snippet(""),
                remediation: check.remediation,
            },
        });
    }

    return findings;
}

module.exports = { scanConfigPatterns };
