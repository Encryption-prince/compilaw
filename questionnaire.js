const readlineSync = require("readline-sync");

function runQuestionnaire() {
    console.log("Before scanning, a few quick questions:\n");

    const userLocation = readlineSync.question(
        "1. Where are your users mainly located? (india / global / both): "
    );

    const sector = readlineSync.question(
        "2. What sector is this product in? (general / fintech / health / other): "
    );

    const handlesMinors = readlineSync.keyInYNStrict(
        "3. Does this product knowingly handle data of users under 18?"
    );

    return {
        userLocation: userLocation.toLowerCase(),
        sector: sector.toLowerCase(),
        handlesMinors: handlesMinors,
    };
}

module.exports = { runQuestionnaire };