// rules.js
// A simplified starting knowledge base.
// A qualified lawyer must review this before any real-world use —
// citations here are illustrative for learning purposes.

const DPDP_RULES = {
    "Email field": {
        citation: "DPDP Act 2023, Section 5 (Notice)",
        ruleText: "A Data Fiduciary must give clear notice describing what personal data is collected and for what purpose, before or at the time of collection.",
        severity: "High",
        remediation: "Confirm a consent/notice mechanism exists before this email field is collected.",
    },
    "Phone number field": {
        citation: "DPDP Act 2023, Section 5 (Notice)",
        ruleText: "Same notice requirement as above — applies to any directly identifying contact data.",
        severity: "High",
        remediation: "Confirm notice/consent covers phone number collection specifically.",
    },
    "Full name field": {
        citation: "DPDP Act 2023, Section 4 (Grounds for processing)",
        ruleText: "Personal data may only be processed for a lawful purpose with consent or another permitted legitimate use.",
        severity: "Medium",
        remediation: "Verify there's a documented lawful basis for storing full names.",
    },
    "Date of birth field": {
        citation: "DPDP Rules 2025, provisions on processing of children's data",
        ruleText: "Date of birth is often used to determine whether a user is a minor, triggering parental-consent obligations.",
        severity: "High",
        remediation: "Check whether age-verification and parental consent flows exist wherever this field feeds into onboarding.",
    },
    "Address field": {
        citation: "DPDP Act 2023, Section 8 (Security safeguards)",
        ruleText: "Data Fiduciaries must implement reasonable security safeguards to prevent personal data breaches.",
        severity: "Medium",
        remediation: "Confirm this field is encrypted at rest and access-controlled.",
    },
    "Government ID field": {
        citation: "DPDP Act 2023, Section 8 (Security safeguards)",
        ruleText: "Government-issued ID numbers are highly sensitive identifiers requiring the strongest safeguards.",
        severity: "Critical",
        remediation: "Should never appear in plaintext logs or unencrypted storage — top priority.",
    },
    "Password field": {
        citation: "DPDP Act 2023, Section 8 (Security safeguards)",
        ruleText: "Credentials require strong technical safeguards; plaintext storage would likely breach reasonable-security obligations.",
        severity: "Critical",
        remediation: "Confirm passwords are hashed (never stored in plaintext) — this is a security baseline, not just a legal one.",
    },
    "Financial/bank field": {
        citation: "DPDP Act 2023, Section 8 (Security safeguards); also check RBI data-localisation rules for payment data",
        ruleText: "Financial identifiers require strong safeguards, and payment-related data may face sector-specific storage-location rules.",
        severity: "Critical",
        remediation: "Confirm encryption at rest, and check with counsel whether RBI payment-data storage rules apply.",
    },
    "Health field": {
        citation: "DPDP Act 2023, Section 8 (Security safeguards); may also trigger sector-specific health-data rules",
        ruleText: "Health data is highly sensitive in practice even though DPDP does not create a separate 'sensitive data' category like some other laws.",
        severity: "Critical",
        remediation: "Flag for legal review — health data often needs stricter handling than general personal data.",
    },
    "Biometric field": {
        citation: "DPDP Act 2023, Section 8 (Security safeguards)",
        ruleText: "Biometric identifiers are effectively irreplaceable if compromised, warranting the highest safeguard standard.",
        severity: "Critical",
        remediation: "Confirm strong encryption, strict access control, and minimal retention.",
    },
    "Location field": {
        citation: "DPDP Act 2023, Section 5 (Notice)",
        ruleText: "Precise location data collection should be clearly disclosed to the user, similar to other identifying data.",
        severity: "Medium",
        remediation: "Confirm notice covers location collection and that precision/retention is minimized.",
    },
};

module.exports = { DPDP_RULES };