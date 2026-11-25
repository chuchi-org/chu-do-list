// FILENAME: resetPassword.js

document.addEventListener("DOMContentLoaded", () => {
    
    const resetPassForm = document.getElementById('reset-password-form');
    const message = document.getElementById('reset-pass-message');

    if ( resetPassForm ) {
        resetPassForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const code           = document.getElementById("reset-pass-code").value.trim();
            const newPass        = document.getElementById("reset-pass-new").value;
            const newPassConfirm = document.getElementById("reset-pass-new-confirm").value;

            if ( !(newPass == newPassConfirm) ) {
                message.textContent = "New Password and Confirm Password do not match."
                message.style.color = "red";
                return;
            }
            message.textContent = "Processing...";
            message.style.color = "black";

            try {
                const response = await fetch("/reset-password", {
                    method: "POST",
                    headers: {
                        "content-type": "Application/json"
                    },
                    body: JSON.stringify({ token: code, password: newPass })
                });
                const data = await response.json();

                if ( response.ok ) {
                    message.textContent = "Password reset successful. Redirecting to login...";
                    message.style.color = "green";
                    resetPassForm.reset();
                    setTimeout(() => { location.href = "/login"; }, 2000);
                } else {
                    message.textContent = data.error || "An error occured.";
                    message.style.color = "red";
                }

            } catch (error) {
                console.error("Error: ", error);
                message.textContent = "Failed to connect to the server";
            }

        });
    }
});