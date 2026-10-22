// [FILENAME]: collab.js

document.addEventListener('DOMContentLoaded', () => {
    const addMemberBtn = document.getElementById('add-member-btn');
    if (!addMemberBtn) return;

    addMemberBtn.addEventListener('click', async () => {
        if ( window.activeListId === 'personal' ) return;

        const emailInput = document.getElementById('member-email-input');
        const email      = emailInput.value.trim();
        const feedbackEl = document.getElementById('member-feedback');

        if ( !email ) return;

        const response = await fetch(`/lists/${window.activeListId}/members`, {
            method:    'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });

        const data = await response.json();

        feedbackEl.classList.remove('hidden', 'form-error', 'form-success');
        if ( response.ok ) {
            feedbackEl.classList.add('form-success');
            feedbackEl.textContent = `Added ${email} successfully`;
            emailInput.value = '';
        }

        else {
            feedbackEl.classList.add('form-error');
            feedbackEl.textContent = data.error || 'Could not add member.'
        }
    })
});