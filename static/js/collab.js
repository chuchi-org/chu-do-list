// [FILENAME]: collab.js

document.addEventListener('DOMContentLoaded', () => {
    const addMemberBtn = document.getElementById('add-member-btn');
    if (!addMemberBtn) return;

    addMemberBtn.addEventListener('click', async () => {
        if ( window.activeListId === 'personal' ) return;

        const emailInput = document.getElementById('member-email-input');
        const email      = emailInput.value.trim();
        const feedbackEl = document.getElementById('member-feedback');

        // one helper instead of repeating class juggling
        function showFeedback(kind, message) {
            feedbackEl.classList.remove('hidden', 'form-error', 'form-success');
            feedbackEl.classList.add(kind);
            feedbackEl.textContent = message;
        }

        if ( !email ) {
            showFeedback('form-error', 'Please enter an email address.');
            return;
        }

        // loading state, blocks double-clicks while request is in flight
        const originalLabel         = addMemberBtn.textContent;
        addMemberBtn.disabled       = true;
        addMemberBtn.textContent    = 'Adding...'

        // try/catch/finally so failures are handled and button always recovers
        try {
            const response = await fetch(`/lists/${window.activeListId}/members`, {
                method:     'POST',
                headers:    { 'Content-Type': 'application/json' },
                body:       JSON.stringify({ email: email })
            });

            // session expired, send them to log in again
            if ( response.status === 401 ) {
                window.location.href = '/login';
                return;
            }

            const data = await response.json()

            if ( response.ok ) {
                showFeedback('form-success', `Added ${email} successfully`);
                emailInput.value = '';
            } else {
                showFeedback('form-error', data.error || 'Could not add member.');
            }
        } catch (err) {
            // network down or the server sent something that isn't JSON
            showFeedback('form-error', 'Could not reach the server. Please try again.');
        } finally {
            // runs on success,error, or early return, so the button never stays stuck
            addMemberBtn.disabled       = false;
            addMemberBtn.textContent    = originalLabel;
        }
    });
});