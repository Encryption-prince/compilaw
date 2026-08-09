// rules.js
// Citations verified directly against the DPDP Act 2023 (Gazette, 11 Aug 2023)
// and DPDP Rules 2025 (Gazette, 13 Nov 2025) primary source text.
// Still not a substitute for legal review of a specific business's practices.

const DPDP_RULES = {
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
        remediation: "Confirm passwords are hashed (never stored in plaintext).",
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
    "Breach notification (general reminder)": {
        citation: "DPDP Act 2023, Section 8(6); DPDP Rules 2025, Rule 7",
        ruleText: "On becoming aware of a breach: affected users must be notified without delay (Rule 7(1)), and the Board must be notified without delay, with full details within 72 hours (Rule 7(2)).",
        severity: "High",
        remediation: "Not code-detectable — confirm a breach-response process exists that can meet the 72-hour Board notification window.",
    },
};

module.exports = { DPDP_RULES };