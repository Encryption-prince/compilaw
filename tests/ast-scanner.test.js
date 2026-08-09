const test = require("node:test");
const assert = require("node:assert");
const { scanJSFileWithAST } = require("../ast-scanner");

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

test("does not flag console.log as a call site", () => {
    const code = `
    const userEmail = "test@example.com";
    console.log("debug", userEmail);
  `;
    const results = scanJSFileWithAST("fake.js", code);
    assert.strictEqual(results.some((r) => r.type === "data-flow"), false);
});