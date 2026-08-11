const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const RISKY_LICENSES = ["GPL-2.0", "GPL-3.0", "AGPL-3.0", "LGPL-2.1", "LGPL-3.0"];

function scanDependencies(targetFolder, installDeps) {
    const packageJsonPath = path.join(targetFolder, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
        console.warn("No package.json found in target folder — skipping dependency scan.");
        return [];
    }

    let packageJson;
    try {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    } catch (err) {
        console.warn("package.json exists but could not be parsed — skipping dependency scan.");
        return [];
    }

    const nodeModulesPath = path.join(targetFolder, "node_modules");

    if (installDeps && !fs.existsSync(nodeModulesPath)) {
        console.log(`Installing dependencies in ${targetFolder} for accurate license data...`);
        try {
            execSync("npm install --omit=dev", { cwd: targetFolder, stdio: "inherit" });
        } catch (err) {
            console.warn("npm install failed — continuing with limited license data.");
        }
    }

    const dependencies = packageJson.dependencies || {};
    const results = [];

    for (const depName in dependencies) {
        const depPackageJsonPath = path.join(targetFolder, "node_modules", depName, "package.json");

        if (!fs.existsSync(depPackageJsonPath)) {
            results.push({ name: depName, version: "unknown", license: "unknown", risky: false });
            continue;
        }

        const depPackageJson = JSON.parse(fs.readFileSync(depPackageJsonPath, "utf-8"));
        const license = depPackageJson.license || "unspecified";
        const isRisky = RISKY_LICENSES.includes(license);

        results.push({
            name: depName,
            version: depPackageJson.version,
            license: license,
            risky: isRisky,
        });
    }

    return results;
}

module.exports = { scanDependencies };