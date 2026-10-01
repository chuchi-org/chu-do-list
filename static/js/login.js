// FILENAME: login.js

const loginModalBtn = document.getElementById('show-login-modal-btn');
const loginModal    = document.getElementById('login-modal-container');
const loginForm     = document.getElementById('login-form');
const errorMessage  = document.getElementById('error-message');

// toggle login form visibility
loginModalBtn.addEventListener('click', () => {
    console.log("loginModalBtn clicked");
    loginModal.classList.toggle('hidden');
});

loginModal.addEventListener('click', function (event) {
    if (event.target === loginModal) {
        loginModal.classList.add('hidden');
    }
});


// toggle error message visibility
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    // collect email and password from login form' fields
    const payload = {
        email:    document.getElementById('login-email').value,
        password: document.getElementById('login-password').value,
    };

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
        // proceed to to-do list
        location.href = 'profile';
    } else {
        showError(data.error);
    }
})