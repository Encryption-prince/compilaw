// sample-code/user.js
const userEmail = "test@example.com";
const userPhone = "9876543210";

analytics.track(userEmail);

function saveUser(name, email, phone) {
    console.log("Saving user:", name, email, phone);
}