// sample-code/user.js
const userEmail = "test@example.com";
const userPhone = "9876543210";
const x = "test@example.com";


function process(payload) {
    console.log(payload);
}

analytics.track(userEmail);

function saveUser(name, email, phone) {
    console.log("Saving user:", name, email, phone);
}

const { persist } = require("./services/storage");

const contactHandle = "sam@example.com";
const reachNumber = "9876543210";
persist({ contactHandle, reachNumber });