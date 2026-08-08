// patterns.js
// Note the \b (word boundary) on BOTH sides of "pan" — this fixes a real bug
// where /pan\b/i alone would incorrectly match inside "Japan".

const PII_PATTERNS = [
    { label: "Email field", regex: /email/i },
    { label: "Phone number field", regex: /phone|mobile/i },
    { label: "Full name field", regex: /fullname|full_name|username/i },
    { label: "Date of birth field", regex: /dob|dateofbirth|date_of_birth/i },
    { label: "Address field", regex: /address/i },
    { label: "Government ID field", regex: /aadhaar|aadhar|\bpan\b|passport/i },
    { label: "Password field", regex: /password|passwd/i },
    { label: "Financial/bank field", regex: /bankaccount|ifsc|accountnumber|cardnumber/i },
    { label: "Health field", regex: /health|medical|diagnosis/i },
    { label: "Biometric field", regex: /biometric|fingerprint|faceid/i },
    { label: "Location field", regex: /latitude|longitude|geolocation/i },
];

module.exports = { PII_PATTERNS };
module.exports = { PII_PATTERNS };