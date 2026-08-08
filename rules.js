// rules.js
// Citations verified against the DPDP Act 2023 section structure and
// DPDP Rules 2025 as of Aug 2026. Still NOT a substitute for legal review —
// exact sub-clause wording should be verified against the official gazette text
// before this is used on a real project.

const DPDP_RULES = {
    "Email field": {
        citation: "DPDP Act 2023, Section 5 (Notice and consent)",
        ruleText: "A Data Fiduciary must give clear notice and obtain consent before collecting personal data, describing what is collected and why.",
        severity: "High",
        remediation: "Confirm a consent/notice mechanism exists before this email field is collected.",
    },
    "Phone number field": {
        citation: "DPDP Act 2023, Section 5 (Notice and consent)",
        ruleText: "Same notice-and-consent requirement as above — applies to any directly identifying contact data.",
        severity: "High",
        remediation: "Confirm notice/consent covers phone number collection specifically.",
    },
    "Full name field": {
        citation: "DPDP Act 2023, Section 4 (Grounds for processing)",
        ruleText: "Personal data may only be processed for a lawful purpose with consent (Section 5) or a legitimate use listed in Section 7.",
        severity: "Medium",
        remediation: "Verify there's a documented lawful basis (consent or a Section 7 legitimate use) for storing full names.",
    },
    "Date of birth field": {
        citation: "DPDP Act 2023, Section 9 (Processing of children's data)",
        ruleText: "Section 9 imposes special obligations — including verifiable parental consent — where a Data Fiduciary processes a child's personal data.",
        severity: "High",
        remediation: "Check whether age-verification and parental consent flows exist wherever this field feeds into onboarding.",
    },
    "Address field": {
        citation: "DPDP Act 2023, Section 8(5) (Reasonable security safeguards)",
        ruleText: "Data Fiduciaries must implement reasonable security safeguards to prevent a personal data breach.",
        severity: "Medium",
        remediation: "Confirm this field is encrypted at rest and access-controlled.",
    },
    "Government ID field": {
        citation: "DPDP Act 2023, Section 8(5) (Reasonable security safeguards)",
        ruleText: "Government-issued ID numbers are highly sensitive identifiers requiring the strongest safeguards; this sub-section carries the Act's highest penalty tier (up to ₹250 crore).",
        severity: "Critical",
        remediation: "Should never appear in plaintext logs or unencrypted storage — top priority.",
    },
    "Password field": {
        citation: "DPDP Act 2023, Section 8(5) (Reasonable security safeguards)",
        ruleText: "Credentials require strong technical safeguards; plaintext storage would likely breach the reasonable-security obligation.",
        severity: "Critical",
        remediation: "Confirm passwords are hashed (never stored in plaintext).",
    },
    "Financial/bank field": {
        citation: "DPDP Act 2023, Section 8(5); RBI data-localisation rules may separately apply",
        ruleText: "Financial identifiers require strong safeguards, and payment-related data may face sector-specific storage-location rules outside DPDP.",
        severity: "Critical",
        remediation: "Confirm encryption at rest, and check with counsel whether RBI payment-data storage rules apply.",
    },
    "Health field": {
        citation: "DPDP Act 2023, Section 8(5); no separate 'sensitive data' category exists under DPDP",
        ruleText: "Unlike GDPR, DPDP does not create a formal special category for health data — but Section 8(5)'s safeguard obligation still applies, and sector rules may add more.",
        severity: "Critical",
        remediation: "Flag for legal review — health data often warrants stricter handling in practice.",
    },
    "Biometric field": {
        citation: "DPDP Act 2023, Section 8(5) (Reasonable security safeguards)",
        ruleText: "Biometric identifiers are effectively irreplaceable if compromised, warranting the highest safeguard standard.",
        severity: "Critical",
        remediation: "Confirm strong encryption, strict access control, and minimal retention.",
    },
    "Location field": {
        citation: "DPDP Act 2023, Section 5 (Notice and consent)",
        ruleText: "Precise location data collection should be clearly disclosed and consented to, like other identifying data.",
        severity: "Medium",
        remediation: "Confirm notice covers location collection and that precision/retention is minimized.",
    },
    "Breach notification (general reminder)": {
        citation: "DPDP Act 2023, Section 8(6) (Breach notification)",
        ruleText: "Separately from safeguards, Data Fiduciaries must notify the Data Protection Board and affected users in the event of a personal data breach.",
        severity: "High",
        remediation: "This isn't code-detectable — confirm a breach-response and notification process exists organizationally.",
    },
};

module.exports = { DPDP_RULES };