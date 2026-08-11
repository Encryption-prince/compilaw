// ollama-client.js
const { PII_PATTERNS } = require("./patterns");

const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "qwen2.5-coder:7b";

const CATEGORY_NAMES = PII_PATTERNS.map((p) => p.label);

function buildPrompt(filePath, content, importedContext) {
    let context = "";
    if (importedContext.length > 0) {
        context = "\n\nRelevant imported file(s), for cross-file context:\n";
        for (const imp of importedContext) {
            context += `\n--- ${imp.path} ---\n${imp.content}\n`;
        }
    }

    return `You are a static analysis tool. Analyze the following source code and identify EVERY variable, field, or parameter that could hold personal data — including ones with vague or generic names.

Only choose categories from this exact list (copy the spelling exactly):
${CATEGORY_NAMES.join(", ")}

File: ${filePath}
Code:
${content}
${context}

Respond with ONLY valid JSON in exactly this shape, with no explanation text before or after:
{"findings": [{"name": "fullName", "line": 3, "category": "Full name field", "reason": "stores a person's full name"}]}

If nothing qualifies, respond with exactly: {"findings": []}`;
}

async function analyzeFileWithLLM(filePath, content, importedContext) {
    const prompt = buildPrompt(filePath, content, importedContext);

    try {
        const response = await fetch(OLLAMA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: MODEL,
                prompt: prompt,
                stream: false,
                format: "json",
                options: { temperature: 0.1 },
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama responded ${response.status}`);
        }

        const data = await response.json();

        if (process.env.COMPILAW_DEBUG) {
            console.log(`\n[DEBUG] Raw model response for ${filePath}:\n${data.response}\n`);
        }

        const parsed = JSON.parse(data.response);
        const items = Array.isArray(parsed.findings) ? parsed.findings : [];

        return items.filter((item) =>
            item && typeof item.category === "string" &&
            CATEGORY_NAMES.some((c) => c.toLowerCase() === item.category.toLowerCase())
        ).map((item) => ({
            ...item,
            category: CATEGORY_NAMES.find((c) => c.toLowerCase() === item.category.toLowerCase()),
        }));
    } catch (err) {
        console.warn(`LLM analysis failed for ${filePath}: ${err.message}`);
        return [];
    }
}

module.exports = { analyzeFileWithLLM };