const test = require("node:test");
const assert = require("node:assert");
const { matchPattern } = require("../lib/patterns");

test("matches an email field name", () => {
    const result = matchPattern("userEmail");
    assert.strictEqual(result.label, "Email field");
});

test("does not match an unrelated name", () => {
    assert.strictEqual(matchPattern("randomVariable"), null);
});

test("excludes network address from Address field match", () => {
    assert.strictEqual(matchPattern("ipAddress"), null);
});

test("still matches a genuine address field", () => {
    const result = matchPattern("homeAddress");
    assert.strictEqual(result.label, "Address field");
});