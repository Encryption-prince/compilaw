// patterns.js
const PII_PATTERNS = [
    // ── Contact & identity ────────────────────────────────────────────────
    {
        label: "Email field",
        regex: /email|e.?mail|emailAddr|emailAddress/i,
        confidence: 0.85,
    },
    {
        label: "Phone number field",
        regex: /phone|mobile|cell|phoneNo|phoneNum|mobileNo|mobileNum|contactNo|whatsapp/i,
        confidence: 0.8,
    },
    {
        label: "Full name field",
        regex: /fullname|full_name|firstname|first_name|lastname|last_name|middlename|username|displayName|realName|legalName/i,
        confidence: 0.6,
    },
    {
        label: "Date of birth field",
        regex: /\bdob\b|dateofbirth|date_of_birth|birthdate|birth_date|birthDay/i,
        excludeRegex: /storage|local|session|async|max|cache|cookie|expir/i,
        confidence: 0.85,
    },
    {
        label: "Address field",
        regex: /\baddress\b|streetAddr|postalAddr|residenceAddr|homeAddr|billingAddr|shippingAddr|mailingAddr/i,
        excludeRegex: /ip|mac|socket|remote|local|network|server|client|url|endpoint|header|proxy|email/i,
        confidence: 0.6,
    },
    // ── Government IDs (India-specific + general) ─────────────────────────
    {
        label: "Government ID field",
        regex: /aadhaar|aadhar|\bpan\b|pancard|pan_card|passport|voter.?id|driving.?licen|dl.?no|national.?id|nid\b|ssn\b|sin\b|taxId|tin\b/i,
        confidence: 0.9,
    },
    // ── Auth & credentials ────────────────────────────────────────────────
    {
        label: "Password field",
        regex: /password|passwd|passphrase|pwd\b|secret\b|pin\b|mpin\b|otp\b/i,
        excludeRegex: /reset|forgot|change|confirm|strength|policy|hint|placeholder|label|error|message|description/i,
        confidence: 0.9,
    },
    {
        label: "Auth token field",
        regex: /\btoken\b|authToken|accessToken|refreshToken|bearerToken|apiKey|api_key|jwtToken|sessionToken|sessionId/i,
        excludeRegex: /csrf|xsrf|anti.?forgery|tokenize|tokenization/i,
        confidence: 0.8,
    },
    // ── Financial ─────────────────────────────────────────────────────────
    {
        label: "Financial/bank field",
        regex: /bankaccount|bank_account|ifsc|accountnumber|account_number|cardnumber|card_number|cvv\b|creditcard|debitcard|upi\b|vpa\b|iban\b|routingNumber|sort.?code|bsb\b/i,
        confidence: 0.9,
    },
    // ── Health ────────────────────────────────────────────────────────────
    {
        label: "Health field",
        regex: /\bhealth\b|medical|diagnosis|prescription|medicine|symptom|condition|bloodGroup|blood_group|bmi\b|weight\b|height\b|disability|disability|mentalHealth|chronicIllness/i,
        excludeRegex: /healthCheck|healthStatus|serviceHealth|pingHealth/i,
        confidence: 0.65,
    },
    // ── Biometrics ────────────────────────────────────────────────────────
    {
        label: "Biometric field",
        regex: /biometric|fingerprint|faceid|faceId|face_id|retina|iris\b|voiceprint|dna\b/i,
        confidence: 0.9,
    },
    // ── Location ──────────────────────────────────────────────────────────
    {
        label: "Location field",
        regex: /latitude|longitude|geolocation|geo_location|latlng|lat\b|lng\b|coords\b|currentLocation|userLocation|zipcode|zip_code|pincode|pin_code/i,
        excludeRegex: /placeholder|template|example|sample/i,
        confidence: 0.75,
    },
    // ── Device & behavioral ───────────────────────────────────────────────
    {
        label: "Device identifier field",
        regex: /deviceId|device_id|imei\b|udid\b|macAddress|mac_address|hardwareId|serialNumber|installationId/i,
        confidence: 0.8,
    },
    // ── Employment & demographics ─────────────────────────────────────────
    {
        label: "Employment field",
        regex: /employer|employeeId|employee_id|salary\b|compensation|designation|jobTitle|department\b/i,
        confidence: 0.65,
    },
    {
        label: "Demographic field",
        regex: /\bgender\b|\bsex\b|nationality|ethnicity|religion|caste\b|maritalStatus|marital_status/i,
        excludeRegex: /regex|expression|generic/i,
        confidence: 0.7,
    },
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
