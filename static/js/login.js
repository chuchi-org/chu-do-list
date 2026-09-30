// FILENAME: login.js

const loginModalBtn = document.getElementById('show-login-modal-btn');
const loginModal    = document.getElementById('login-modal-container');

loginModalBtn.addEventListener('click', () => {
    console.log("loginModalBtn clicked");
    loginModal.classList.toggle('hidden');
});