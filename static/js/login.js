// FILENAME: login.js

const loginModalBtn = document.getElementById('show-login-modal-btn');
const loginModal    = document.getElementById('login-modal-container');
const loginForm     = document.getElementById('login-form');
const errorMessage  = document.getElementById('error-message');
const submitBtn     = document.getElementById('submit-btn');
const emailInput    = document.getElementById('login-email');
const passwordInput = document.getElementById('login-password');

// error & loading helpers
function clearError() {
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

// loading state, blocks double-submits while request is in flight
function setLoading(isLoading) {
    submitBtn.disabled      = isLoading;
    submitBtn.textContent   = isLoading? 'Loggin in...' : 'Log In';
}

// modal open/close
function openModal() {
    loginModal.classList.remove('hidden');
    emailInput.focus();     // cursor is ready in the first field
}

function closeModal() {
    loginModal.classList.add('hidden');
    clearError();       // don't show old error when it is reopened
}

// toggle login form visibility
loginModalBtn.addEventListener('click', openModal);

loginModal.addEventListener('click', function (event) {
    if (event.target === loginModal) {
        closeModal();
    }
});

document.addEventListener('keydown',function (event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

// clear old error as soon as user starts fixing it
emailInput.addEventListener('input', clearError);
passwordInput.addEventListener('input', clearError);

// submit
loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    clearError();
    setLoading(true);

    // collect email and password from login form' fields
    const payload = {
        email:    emailInput.value,
        password: passwordInput.value,
    };

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            // proceed to to-do list; button stays disabled while page changes
            location.href = '/';
            return;
        }
            showError(data.error || 'Something went wrong. Please try again.');
    } catch (error) {
        // network down or server sent something that isn't JSON
            showError('COuld not reach the server. Please try again.');
    }

    setLoading(false);
});