// patterns.js
const PII_PATTERNS = [
    { label: "Email field", regex: /email/i, confidence: 0.85 },
    { label: "Phone number field", regex: /phone|mobile/i, confidence: 0.8 },
    { label: "Full name field", regex: /fullname|full_name|username/i, confidence: 0.6 },
    { label: "Date of birth field", regex: /dob|dateofbirth|date_of_birth/i, confidence: 0.85 },
    {
        label: "Address field",
        regex: /address/i,
        excludeRegex: /ip|mac|socket|remote|local|network|server|client|url|endpoint|header|proxy/i,
        confidence: 0.55,
    },
    { label: "Government ID field", regex: /aadhaar|aadhar|\bpan\b|passport/i, confidence: 0.8 },
    { label: "Password field", regex: /password|passwd/i, confidence: 0.9 },
    { label: "Financial/bank field", regex: /bankaccount|ifsc|accountnumber|cardnumber/i, confidence: 0.85 },
    { label: "Health field", regex: /health|medical|diagnosis/i, confidence: 0.6 },
    { label: "Biometric field", regex: /biometric|fingerprint|faceid/i, confidence: 0.85 },
    { label: "Location field", regex: /latitude|longitude|geolocation/i, confidence: 0.75 },
];

function matchPattern(name) {
    for (const pattern of PII_PATTERNS) {
        const matches = pattern.regex.test(name);
        const isExcluded = pattern.excludeRegex ? pattern.excludeRegex.test(name) : false;
        if (matches && !isExcluded) {
            return pattern;
        }
    }
    return null;
}

module.exports = { PII_PATTERNS, matchPattern };