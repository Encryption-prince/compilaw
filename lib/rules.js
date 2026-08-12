// rules.js
// Citations verified directly against the DPDP Act 2023 (Gazette, 11 Aug 2023)
// and DPDP Rules 2025 (Gazette, 13 Nov 2025) primary source text.
// Still not a substitute for legal review of a specific business's practices.

const DPDP_RULES = {
    // ── PII field categories ──────────────────────────────────────────────
    "Email field": {
        citation: "DPDP Act 2023, Section 5 (Notice) read with Section 6 (Consent); DPDP Rules 2025, Rule 3",
        ruleText: "Every consent request must be preceded by notice describing what data is collected and why. Consent itself must be free, specific, informed, unconditional, and given through clear affirmative action.",
        severity: "High",
        remediation: "Confirm a notice is shown before consent is requested, and that consent capture meets the 'clear affirmative action' standard (no pre-ticked boxes, no bundled consent).",
    },
    "Phone number field": {
        citation: "DPDP Act 2023, Section 5 (Notice) read with Section 6 (Consent); DPDP Rules 2025, Rule 3",
        ruleText: "Same notice-and-consent standard as email — applies to any directly identifying contact data.",
        severity: "High",
        remediation: "Confirm notice/consent covers phone number collection specifically, not bundled with unrelated purposes.",
    },
    "Full name field": {
        citation: "DPDP Act 2023, Section 4 (Grounds for processing)",
        ruleText: "Personal data may only be processed for a lawful purpose with consent (Section 6) or a legitimate use listed in Section 7.",
        severity: "Medium",
        remediation: "Verify there's a documented lawful basis for storing full names — either consent or a specific Section 7 legitimate use.",
    },
    "Date of birth field": {
        citation: "DPDP Act 2023, Section 9 (Processing of personal data of children); DPDP Rules 2025, Rule 10",
        ruleText: "Before processing a child's data, verifiable parental consent is required, including due diligence to confirm the parent is an identifiable adult (Rule 10).",
        severity: "High",
        remediation: "Check whether age-verification and parental-consent flows exist wherever this field feeds into onboarding.",
    },
    "Address field": {
        citation: "DPDP Act 2023, Section 8(5) (Reasonable security safeguards); DPDP Rules 2025, Rule 6",
        ruleText: "Rule 6 specifies minimum safeguards: encryption/masking, access controls, breach-detection logging (retained 1 year minimum).",
        severity: "Medium",
        remediation: "Confirm this field is encrypted at rest, access-controlled, and access is logged per Rule 6.",
    },
    "Government ID field": {
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        ruleText: "Government-issued ID numbers are highly sensitive identifiers requiring the Rule 6 safeguard baseline; this carries the Act's highest penalty tier (up to ₹250 crore under the Schedule).",
        severity: "Critical",
        remediation: "Should never appear in plaintext logs or unencrypted storage — top priority.",
    },
    "Password field": {
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        ruleText: "Credentials require the Rule 6 safeguard baseline; plaintext storage would breach the reasonable-security obligation.",
        severity: "Critical",
        remediation: "Confirm passwords are hashed (never stored in plaintext). Use bcrypt, argon2, or scrypt — never MD5/SHA1.",
    },
    "Auth token field": {
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        ruleText: "Auth tokens are functionally equivalent to credentials — if exposed they grant access to a user's personal data.",
        severity: "Critical",
        remediation: "Tokens must never appear in logs, URLs, or error messages. Rotate secrets regularly and use short expiry.",
    },
    "Financial/bank field": {
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6; RBI data-localisation rules may separately apply",
        ruleText: "Financial identifiers require Rule 6 safeguards; payment data may also face sector-specific storage-location rules outside DPDP.",
        severity: "Critical",
        remediation: "Confirm encryption at rest, and check with counsel whether RBI payment-data storage rules apply.",
    },
    "Health field": {
        citation: "DPDP Act 2023, Section 8(5); no separate 'sensitive data' category exists in the Act's text",
        ruleText: "Unlike GDPR, the DPDP Act's definitions (Section 2) do not create a distinct special category for health data — but Section 8(5)'s safeguard obligation still applies fully, and sector rules may add more.",
        severity: "Critical",
        remediation: "Flag for legal review — health data often warrants stricter handling in practice regardless.",
    },
    "Biometric field": {
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        ruleText: "Biometric identifiers are effectively irreplaceable if compromised, warranting the strictest application of the Rule 6 safeguard baseline.",
        severity: "Critical",
        remediation: "Confirm strong encryption, strict access control, and minimal retention.",
    },
    "Location field": {
        citation: "DPDP Act 2023, Section 5 (Notice) read with Section 6 (Consent)",
        ruleText: "Precise location data collection should be clearly disclosed via notice and consented to, on the same standard as other identifying data.",
        severity: "Medium",
        remediation: "Confirm notice covers location collection and that precision/retention is minimized.",
    },
    "Device identifier field": {
        citation: "DPDP Act 2023, Section 5 (Notice) read with Section 6 (Consent); Section 8(5)",
        ruleText: "Device identifiers can be used to track individuals across sessions and contexts — they constitute personal data under Section 2(t) of the Act.",
        severity: "Medium",
        remediation: "Disclose device identifier collection in the privacy notice. Minimize retention and avoid cross-context tracking without consent.",
    },
    "Employment field": {
        citation: "DPDP Act 2023, Section 4 (Grounds for processing); Section 7 (Legitimate uses)",
        ruleText: "Employment data may be processed under Section 7's legitimate use for employment/service contracts, but still requires notice and must not be used for unrelated purposes.",
        severity: "Low",
        remediation: "Ensure employment data is only used for the stated employment purpose and not shared with third parties without consent.",
    },
    "Demographic field": {
        citation: "DPDP Act 2023, Section 5 (Notice) read with Section 6 (Consent); Section 4",
        ruleText: "Demographic fields (gender, religion, caste etc.) can enable discriminatory profiling. They require explicit, specific consent and a clear lawful purpose.",
        severity: "High",
        remediation: "Audit whether demographic fields are necessary. If collected, ensure specific consent and confirm the data is never used for profiling or discriminatory decisions.",
    },

    // ── Data flow findings ────────────────────────────────────────────────
    "PII object": {
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        ruleText: "An object containing PII fields is being passed to an API call or HTTP response without evidence of filtering. This risks exposing more personal data than intended.",
        severity: "High",
        remediation: "Explicitly select only the fields needed before passing to responses or external calls. Never send raw user/model objects directly — use a serializer or field allowlist.",
    },
    // ── Data flow findings ────────────────────────────────────────────────
    "PII in logs": {
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        ruleText: "Logging PII violates Rule 6's access control and breach-detection obligations — log aggregators often have weaker access controls than production databases.",
        severity: "High",
        remediation: "Use a structured logger with field-level redaction. Never log passwords, tokens, Aadhaar, PAN, or full card numbers.",
    },

    // ── Consent findings ──────────────────────────────────────────────────
    "Missing consent mechanism": {
        citation: "DPDP Act 2023, Section 6 (Consent); DPDP Rules 2025, Rule 3",
        ruleText: "Processing personal data without consent (or a Section 7 legitimate use) is unlawful under the Act. No consent surface was detected in this codebase.",
        severity: "Critical",
        remediation: "Implement a consent capture mechanism before collecting any personal data. Consent must be free, specific, informed, unconditional, and given through clear affirmative action.",
    },
    "Consent without notice": {
        citation: "DPDP Act 2023, Section 5 (Notice) read with Section 6 (Consent); DPDP Rules 2025, Rule 3",
        ruleText: "Section 5 requires notice to be provided before consent is requested. Consent obtained without prior notice is not valid under the Act.",
        severity: "High",
        remediation: "Ensure the privacy notice (Rule 3 format) is shown to users before any consent checkbox or agreement is presented.",
    },

    // ── Config / infrastructure findings ─────────────────────────────────
    "Insecure cookie configuration": {
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        ruleText: "Session cookies without httpOnly or Secure flags can be stolen via XSS or intercepted over HTTP, leading to unauthorized access to personal data.",
        severity: "High",
        remediation: "Set httpOnly: true, secure: true, and sameSite: 'strict' on all session/auth cookies.",
    },
    "Unencrypted database connection": {
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        ruleText: "Database connections without SSL/TLS transmit personal data in plaintext over the network — a direct violation of Rule 6's encryption requirement.",
        severity: "Critical",
        remediation: "Enable SSL/TLS on all database connections. Use ssl: { rejectUnauthorized: true } — never disable certificate validation.",
    },
    "Hardcoded secret / credential": {
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        ruleText: "Hardcoded credentials in source code expose the entire system if the repository is leaked, enabling unauthorized access to all personal data.",
        severity: "Critical",
        remediation: "Use environment variables or a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.). Rotate any credentials that have appeared in source code.",
    },
    "PII in error logs": {
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        ruleText: "PII or credentials in log output can be exposed through log aggregation systems, dashboards, or error tracking tools with broader access than the database.",
        severity: "High",
        remediation: "Implement structured logging with field redaction. Never pass raw user objects or credential values to any logging function.",
    },
    "Missing rate limiting on auth endpoint": {
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        ruleText: "Auth endpoints without rate limiting are vulnerable to credential stuffing and brute force attacks, which can lead to unauthorized access to personal data.",
        severity: "High",
        remediation: "Apply rate limiting middleware (e.g. express-rate-limit) to all login, password reset, and token endpoints.",
    },
    "No data retention policy detected": {
        citation: "DPDP Act 2023, Section 8(3) — storage limitation",
        ruleText: "Section 8(3) requires that personal data is not retained beyond the purpose for which it was collected. No automated deletion or expiry mechanism was detected.",
        severity: "Medium",
        remediation: "Implement automated data purge jobs with documented retention periods. Archive or delete user data after purpose is fulfilled or consent is withdrawn.",
    },
    "Overly permissive CORS": {
        citation: "DPDP Act 2023, Section 8(5); DPDP Rules 2025, Rule 6",
        ruleText: "Wildcard CORS allows any origin to make cross-site requests, potentially enabling unauthorized access to personal data APIs.",
        severity: "Medium",
        remediation: "Restrict CORS to known frontend domains. Never combine origin: '*' with credentials: true.",
    },

    // ── Always-present reminder ───────────────────────────────────────────
    "Breach notification (general reminder)": {
        citation: "DPDP Act 2023, Section 8(6); DPDP Rules 2025, Rule 7",
        ruleText: "On becoming aware of a breach: affected users must be notified without delay (Rule 7(1)), and the Board must be notified without delay, with full details within 72 hours (Rule 7(2)).",
        severity: "High",
        remediation: "Not code-detectable — confirm a breach-response process exists that can meet the 72-hour Board notification window.",
    },
};

module.exports = { DPDP_RULES };
