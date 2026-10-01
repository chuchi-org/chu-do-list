document.addEventListener('DOMContentLoaded', function () {
    // grabs reference to three elements it needs to work with
    const form      = document.getElementById('profile-form');
    const errorEl   = document.getElementById('profile-error');
    const successEl = document.getElementById('profile-success');

    form.addEventListener('submit', async function (event) {
        event.preventDefault(); // intrcepts form's submit event and stops browser's native page-reload behavior

        // resets both feedback messages
        errorEl.classList.add('hidden');
        successEl.classList.add('hidden');
        errorEl.textContent   = '';
        successEl.textContent = '';

        // builds base payload with two fields that are always sent
        // always sent meaning it always has some value in them as form is pre-filled, or from user
        const payload = {
            display_name:   document.getElementById('profile-display-name').value,
            email:          document.getElementById('profile-email').value
        };

        // adds password to payload if it gets changed
        const passwordValue = document.getElementById('profile-password').value;
        if (passwordValue != '') {
            payload.password = passwordValue;
        }

        // sends the request
        // no identifier as browser automatically attaches the session cookie to this request on its own
        const response = await fetch('/profile', {
            method:     'PUT',
            headers:    { 'Content-Type': 'application/json' },
            body:   JSON.stringify(payload)
        });

        // reads the response
        const data = await response.json();

        // shows success message or display specific message error
        if (response.ok) {
            successEl.textContent = 'Profile updated successfully.';
            successEl.classList.remove('hidden');
            document.getElementById('profile-password').value = ''; // clears password field once password is changed
        } else {
            errorEl.textContent = data.error;
            errorEl.classList.remove('hidden');
        }
    });
})