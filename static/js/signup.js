document.addEventListener('DOMContentLoaded', function(){
    const form      = document.getElementById('signup-form');
    const errorEl   = document.getElementById('signup-error');
    const submitBtn = document.getElementById('signup-submit-btn');
    const fields    = form.querySelectorAll('input');

    // error & loading helpers
    function clearError() {
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
    }

    function showError(message) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }

    // loading state, blocks double-submits while request is in flight
    function setLoading(isLoading) {
        submitBtn.disabled      = isLoading;
        submitBtn.textContent   = isLoading ? 'Creating account...' : 'Sign Up';
    }

    // clear old error as soon as user edits any field
    fields.forEach(function (field) {
        field.addEventListener('input', clearError);
    });

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        clearError();
        setLoading(true);

        const payload = {
            display_name:   document.getElementById('display-name').value,
            email:          document.getElementById('email').value,
            password:       document.getElementById('password').value
        };

        try {
            const response = await fetch('/signup', {
                method:     'POST',
                headers:    { 'Content-Type' : 'application/json' },
                body:       JSON.stringify(payload)
            });

            const data  = await response.json();

            if (response.ok) {
                // brief confirmation so redirect doesn't feel like a mystery
                submitBtn.textContent = 'Account created! Redirecting...';
                setTimeout(function () {
                    window.location.href = '/login';
                }, 1000);
                return;
            }
            showError(data.error || 'Something went wrong. Please try again.');
        } catch (error) {
            showError('Could not reach the server. Please try again.')
        }
        setLoading(false);
    });
});