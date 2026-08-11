#!/usr/bin/env node

const command = process.argv[2];

if (command === "dashboard") {
    require("../dashboard/server.js");
} else if (command === "setup") {
    require("../lib/setup.js")();
} else {
    require("../lib/scan.js");
}
