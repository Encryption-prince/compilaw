// rules.js
// A small, simplified starting knowledge base.
// In the real product, a lawyer would author and maintain this.

const DPDP_RULES = {
    "Email field": {
        citation: "DPDP Act 2023, Section 5 (Notice)",
        ruleText: "A Data Fiduciary must give clear notice describing what personal data is collected and for what purpose, before or at the time of collection.",
        severity: "High",
        remediation: "Confirm a consent/notice mechanism exists before this email field is collected, and that users are told why it's collected.",
    },
    "Phone number field": {
        citation: "DPDP Act 2023, Section 5 (Notice)",
        ruleText: "Same notice requirement as above — applies to any directly identifying contact data.",
        severity: "High",
        remediation: "Confirm notice/consent covers phone number collection specifically, not just email.",
    },
    "Full name field": {
        citation: "DPDP Act 2023, Section 4 (Grounds for processing)",
        ruleText: "Personal data may only be processed for a lawful purpose with either consent or another permitted legitimate use.",
        severity: "Medium",
        remediation: "Verify there's a documented lawful basis for storing full names in this model.",
    },
    "Date of birth field": {
        citation: "DPDP Rules 2025, Rule on processing of children's data",
        ruleText: "Date of birth is often used to determine whether a user is a minor, which triggers additional parental-consent obligations.",
        severity: "High",
        remediation: "Check whether age-verification and parental consent flows exist wherever this field feeds into onboarding.",
    },
    "Address field": {
        citation: "DPDP Act 2023, Section 8 (Security safeguards)",
        ruleText: "Data Fiduciaries must implement reasonable security safeguards to prevent personal data breaches.",
        severity: "Medium",
        remediation: "Confirm this field is encrypted at rest and access-controlled, given it's precise location data.",
    },
    "Government ID field": {
        citation: "DPDP Act 2023, Section 8 (Security safeguards)",
        ruleText: "Government-issued ID numbers are highly sensitive identifiers requiring the strongest security safeguards.",
        severity: "Critical",
        remediation: "This should never appear in plaintext logs or unencrypted storage — treat as top priority.",
    },
};

module.exports = { DPDP_RULES };