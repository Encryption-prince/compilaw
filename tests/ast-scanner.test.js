const test = require("node:test");
const assert = require("node:assert");
const { scanJSFileWithAST } = require("../lib/ast-scanner");

test("detects a declared email variable", () => {
    const results = scanJSFileWithAST("fake.js", `const userEmail = "test@example.com";`);
    assert.ok(results.some((r) => r.category === "Email field"));
});

test("flags a data flow to a suspicious function as external risk", () => {
    const code = `
    const userEmail = "test@example.com";
    analytics.track(userEmail);
  `;
    const results = scanJSFileWithAST("fake.js", code);
    const flow = results.find((r) => r.type === "data-flow");
    assert.ok(flow);
    assert.strictEqual(flow.externalRisk, true);
});

test("flags console.log with PII as a logging risk", () => {
    const code = `
    const userEmail = "test@example.com";
    console.log("debug", userEmail);
  `;
    const results = scanJSFileWithAST("fake.js", code);
    const flow = results.find((r) => r.type === "data-flow" && r.subtype === "logging-risk");
    assert.ok(flow, "should flag PII passed to console.log as a logging risk");
});