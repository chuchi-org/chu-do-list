// FILENAME: forgotPassword.js

document.addEventListener("DOMContentLoaded", () => {
    const forgotPassForm = document.getElementById('forgot-password-form');
    const message = document.getElementById("forgot-pass-message");

    if ( forgotPassForm ) {
        forgotPassForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("forgot-pass-email").value.trim();
            message.textContent = "Processing...";
            message.style.color = "black";

            try {
                const response = await fetch("/forgot-password", {
                    method: "POST",
                    headers: {
                        "content-type": "Application/json"
                    },
                    body: JSON.stringify({ email: email })
                });

                const data = await response.json();

                if ( response.ok ) {
                    message.textContent = data.status;
                    forgotPassForm.reset();
                } else {
                    message.textContent = data.error || "An error occured.";
                }

            } catch (error) {
                console.error("Error: ", error);
                message.textContent = "Failed to connect to the server";
            }
        })
    }
})