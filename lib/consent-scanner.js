// consent-scanner.js
// Checks whether a codebase has any consent capture mechanism.
// If PII fields are collected but no consent surface is found, that's a real finding.

const fs = require("fs");
const path = require("path");

// Signals that a consent mechanism likely exists
const CONSENT_SIGNALS = [
    { pattern: /consent/i,               label: "consent variable/field" },
    { pattern: /gdpr|dpdp|privacy/i,     label: "privacy/compliance reference" },
    { pattern: /acceptTerms|agree/i,     label: "terms acceptance field" },
    { pattern: /opt.?in|opt.?out/i,      label: "opt-in/opt-out field" },
    { pattern: /cookieConsent/i,         label: "cookie consent" },
    { pattern: /PrivacyPolicy|TermsOf/i, label: "policy component/link" },
    { pattern: /consentGiven|isConsented|hasConsent/i, label: "consent boolean flag" },
    { pattern: /requestConsent|grantConsent|revokeConsent/i, label: "consent function" },
    { pattern: /DataPrincipal|dataFiduciary/i, label: "DPDP-specific term" },
    { pattern: /\bnotice\b.*\bconsent\b|\bconsent\b.*\bnotice\b/i, label: "notice-and-consent pattern" },
];

// Signals that data is being actively collected from users
const COLLECTION_SIGNALS = [
    /req\.body/,
    /req\.query/,
    /request\.body/,
    /formData/i,
    /getFieldValue|getValue|handleChange/i,
    /useState.*email|useState.*phone|useState.*password/i,
    /onChange.*email|onChange.*phone/i,
    /<input|<form/i,
    /Form\.Item|Field name=/i,
];

function scanForConsent(targetFolder, piiFindings) {
    const consentFindings = [];
    const consentFound = new Set();
    const collectionFiles = new Set();

    // Walk and check every JS/TS/JSX/TSX file for consent signals
    function walk(dir) {
        let entries;
        try { entries = fs.readdirSync(dir); } catch { return; }

        for (const entry of entries) {
            if (["node_modules", ".git", "dist", "build"].includes(entry)) continue;
            const full = path.join(dir, entry);
            let stat;
            try { stat = fs.statSync(full); } catch { continue; }

            if (stat.isDirectory()) {
                walk(full);
            } else {
                const ext = path.extname(full);
                if (![".js", ".jsx", ".ts", ".tsx"].includes(ext)) continue;

                let content;
                try { content = fs.readFileSync(full, "utf-8"); } catch { continue; }

                // Check for consent signals
                for (const sig of CONSENT_SIGNALS) {
                    if (sig.pattern.test(content)) {
                        consentFound.add(sig.label);
                    }
                }

                // Check for data collection signals
                if (COLLECTION_SIGNALS.some(p => p.test(content))) {
                    collectionFiles.add(full);
                }
            }
        }
    }

    walk(targetFolder);

    const hasConsent = consentFound.size > 0;
    const hasCollection = collectionFiles.size > 0 || piiFindings.length > 0;

    // No consent mechanism found at all, but PII is being collected
    if (hasCollection && !hasConsent) {
        consentFindings.push({
            file: targetFolder,
            line: 0,
            category: "Missing consent mechanism",
            snippet: `No consent capture found — ${piiFindings.length} PII field(s) detected across codebase`,
            confidence: 0.8,
            type: "consent-gap",
            subtype: "no-consent-surface",
            externalRisk: false,
        });
    }

    // Consent exists but no notice-before-consent pattern visible
    if (hasConsent && !consentFound.has("notice-and-consent pattern") && piiFindings.length > 0) {
        consentFindings.push({
            file: targetFolder,
            line: 0,
            category: "Consent without notice",
            snippet: "Consent mechanism found but no explicit notice-before-consent pattern detected — DPDP Section 5 requires notice to precede consent",
            confidence: 0.6,
            type: "consent-gap",
            subtype: "notice-missing",
            externalRisk: false,
        });
    }

    // Consent found — report what was found (informational)
    if (hasConsent) {
        consentFindings.push({
            file: targetFolder,
            line: 0,
            category: "Consent surface detected",
            snippet: `Found: ${[...consentFound].join(", ")}`,
            confidence: 1.0,
            type: "consent-ok",
            subtype: "consent-present",
            externalRisk: false,
        });
    }

    return {
        consentFindings: consentFindings.filter(f => f.type !== "consent-ok"), // only surface problems
        consentSignals: [...consentFound],
        hasConsent,
        collectionFileCount: collectionFiles.size,
    };
}

module.exports = { scanForConsent };
