const { execSync } = require("child_process");

async function checkOllama() {
    try {
        const res = await fetch("http://localhost:11434/api/tags");
        return res.ok;
    } catch (err) {
        return false;
    }
}

function checkPython() {
    for (const cmd of ["python3", "python"]) {
        try {
            execSync(`${cmd} --version`, { stdio: "ignore" });
            return cmd;
        } catch (err) {
            // try next candidate
        }
    }
    return null;
}

module.exports = async function runSetup() {
    console.log("CompiLaw setup\n");

    console.log("Checking for Ollama...");
    const ollamaRunning = await checkOllama();
    if (!ollamaRunning) {
        console.log("✗ Ollama not detected at http://localhost:11434");
        console.log("  Install it from: https://ollama.com/download");
        console.log("  Then re-run: compilaw setup\n");
    } else {
        console.log("✓ Ollama is running");
        console.log("Pulling qwen2.5-coder:7b (several GB, may take a while)...");
        try {
            execSync("ollama pull qwen2.5-coder:7b", { stdio: "inherit" });
            console.log("✓ Model ready\n");
        } catch (err) {
            console.log("✗ Could not pull automatically. Run manually: ollama pull qwen2.5-coder:7b\n");
        }
    }

    const pythonCmd = checkPython();
    if (pythonCmd) {
        console.log(`✓ Python found (${pythonCmd}) — full AST parsing enabled for .py files\n`);
    } else {
        console.log("i Python not found — .py files will use the regex fallback instead of AST (optional)\n");
    }

    console.log("Setup complete. Try:");
    console.log("  compilaw ./your-project");
    console.log("  compilaw dashboard");
};
