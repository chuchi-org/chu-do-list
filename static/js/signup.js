document.addEventListener('DOMContentLoaded', function(){
    const form      = document.getElementById('signup-form');
    const errorEl   = document.getElementById('signup-error');

    form.addEventListener('submit', async function (event) {
        event.preventDefault();

        errorEl.classList.add('hidden');
        errorEl.textContent = '';

        const payload = {
            display_name:   document.getElementById('display-name').value,
            email:          document.getElementById('email').value,
            password:       document.getElementById('password').value
        };

        const response = await fetch('/signup', {
            method:     'POST',
            headers:    { 'Content-Type' : 'application/json' },
            body:       JSON.stringify(payload)
        });

        const data  = await response.json();

        if (response.ok) {
            window.location.href = '/login';
        } else {
            errorEl.textContent = data.error;
            errorEl.classList.remove('hidden');
        }
    });
});