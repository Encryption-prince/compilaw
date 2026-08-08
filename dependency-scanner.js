const fs = require("fs");
const path = require("path");

const RISKY_LICENSES = ["GPL-2.0", "GPL-3.0", "AGPL-3.0", "LGPL-2.1", "LGPL-3.0"];

function scanDependencies(targetFolder) {
    const packageJsonPath = path.join(targetFolder, "package.json");
    // ...same as above, just using targetFolder instead of "."

    if (!fs.existsSync(packageJsonPath)) {
        console.warn("No package.json found in current folder — skipping dependency scan.");
        return [];
    }

    let packageJson;
    try {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    } catch (err) {
        console.warn("package.json exists but could not be parsed — skipping dependency scan.");
        return [];
    }

    const dependencies = packageJson.dependencies || {};
    const results = [];

    for (const depName in dependencies) {
        const depPackageJsonPath = path.join(".", "node_modules", depName, "package.json");

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