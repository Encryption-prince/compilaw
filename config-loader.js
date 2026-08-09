const fs = require("fs");
const path = require("path");

const DEFAULT_CONFIG = {
    ignoreFolders: [],
    ignoreCategories: [],
};

function loadConfig(targetFolder) {
    const configPath = path.join(targetFolder, ".compilawrc.json");

    if (!fs.existsSync(configPath)) {
        return DEFAULT_CONFIG;
    }

    try {
        const raw = fs.readFileSync(configPath, "utf-8");
        const userConfig = JSON.parse(raw);
        return {
            ignoreFolders: userConfig.ignoreFolders || [],
            ignoreCategories: userConfig.ignoreCategories || [],
        };
    } catch (err) {
        console.warn(".compilawrc.json found but could not be parsed — using defaults.");
        return DEFAULT_CONFIG;
    }
}

module.exports = { loadConfig };