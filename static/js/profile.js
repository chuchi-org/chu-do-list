// FILENAME: profile.js

document.addEventListener('DOMContentLoaded', function () {
    // grabs reference to three elements it needs to work with
    const form      = document.getElementById('profile-form');
    const errorEl   = document.getElementById('profile-error');
    const successEl = document.getElementById('profile-success');
    const logoutBtn = document.getElementById('logout-btn');
    const submitBtn = document.getElementById('profile-submit-btn');
    const greeting  = document.querySelector('.app-header h1');

    // helpers: show exactly one message at a time
    function showError(message) {
        successEl.classList.add('hidden');
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }

    function showSuccess(message) {
        errorEl.classList.add('hidden');
        successEl.textContent = message;
        successEl.classList.remove('hidden');
    }
    // clear old messages as soon as user edits a fiels
    // stale "success" never sits next to a new, unsaved change
    form.addEventListener('input', () => {
        errorEl.classList.add('hidden');
        successEl.classList.add('hidden');
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/logout', { method: 'POST' });
            if (response.ok) {
                location.href = '/login';
                return;
            }
            showError('Could not log out. Please try again.');
        } catch (err) {
            showError('Could not reach the server. Please try again.');
        }
    });

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

        // loading state, blocks double-submits while request is in flight
        const originalLabel     = submitBtn.textContent;
        submitBtn.disabled      = true;
        submitBtn.textContent   = 'Saving...';

        // try/catch/finally so failures are handled and button always recovers
        try {
            // sends the request
            // no identifier as browser automatically attaches the session cookie to this request on its own
            const response = await fetch('/profile', {
                method:     'PUT',
                headers:    { 'Content-Type': 'application/json' },
                body:   JSON.stringify(payload)
            });

            // session expired, send them to log in again
            if ( response.status === 401 ) { location.href = '/login'; return; }

            // reads the response
            const data = await response.json();

            // shows success message or display specific message error
            if (response.ok) {
                showSuccess('Profile updated successfully.');
                greeting.textContent = `Hello, ${data.display_name}`;
                document.getElementById('profile-password').value = ''; // clears password field once password is changed
            } else {
                showError(data.error || 'Could not update your profile.');
            }
        } catch (err) {
            // network down or server sent something that isn't JSON
            showError('COuld not reach the server. Please try again.');
        } finally {
            submitBtn.disabled      = false;
            submitBtn.textContent   = originalLabel;
        }
    });
});