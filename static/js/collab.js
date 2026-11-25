// [FILENAME]: collab.js

document.addEventListener('DOMContentLoaded', () => {
    const addMemberBtn = document.getElementById('add-member-btn');

    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', async () => {
            if (window.activeListId === 'personal') return;

            const emailInput = document.getElementById('member-email-input');
            const email      = emailInput.value.trim();
            const feedbackEl = document.getElementById('member-feedback');

            // one helper instead of repeating class juggling
            function showFeedback(kind, message) {
                feedbackEl.classList.remove('hidden', 'form-error', 'form-success');
                feedbackEl.classList.add(kind);
                feedbackEl.textContent = message;
            }

            if (!email) {
                showFeedback('form-error', 'Please enter an email address.');
                return;
            }

            // loading state, blocks double-clicks while request is in flight
            const originalLabel      = addMemberBtn.textContent;
            addMemberBtn.disabled    = true;
            addMemberBtn.textContent = 'Adding...';

            // try/catch/finally so failures are handled and button always recovers
            try {
                const response = await fetch(`/lists/${window.activeListId}/members`, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ email: email })
                });

                // session expired, send them to log in again
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }

                const data = await response.json();

                if (response.ok) {
                    showFeedback('form-success', `Added ${email} successfully`);
                    emailInput.value = '';
                } else {
                    showFeedback('form-error', data.error || 'Could not add member.');
                }
            } catch (err) {
                // network down or the server sent something that isn't JSON
                showFeedback('form-error', 'Could not reach the server. Please try again.');
            } finally {
                // runs on success, error, or early return, so the button never stays stuck
                addMemberBtn.disabled    = false;
                addMemberBtn.textContent = originalLabel;
            }
        });
    }

    const listMenuBtn      = document.getElementById('list-menu-btn');
    const listMenuDropdown = document.getElementById('list-menu-dropdown');
    const deleteListBtn    = document.getElementById('delete-list-btn');

    function closeListMenu() {
        if (!listMenuDropdown || !listMenuBtn) return;
        listMenuDropdown.classList.add('hidden');
        listMenuBtn.setAttribute('aria-expanded', 'false');
    }

    if (listMenuBtn && listMenuDropdown) {
        listMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const willOpen = listMenuDropdown.classList.contains('hidden');
            closeListMenu();
            if (willOpen) {
                listMenuDropdown.classList.remove('hidden');
                listMenuBtn.setAttribute('aria-expanded', 'true');
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#list-menu-wrap')) {
                closeListMenu();
            }
        });
    }

    if (deleteListBtn) {
        deleteListBtn.addEventListener('click', async () => {
            closeListMenu();

            if (!window.activeListId || window.activeListId === 'personal' || !window.activeListIsOwner) {
                return;
            }

            const listTitle = document.getElementById('active-list-title')?.textContent?.trim() || 'this list';
            if (!confirm(`Delete "${listTitle}"? This cannot be undone.`)) {
                return;
            }

            const feedbackEl = document.getElementById('member-feedback');
            function showFeedback(kind, message) {
                if (!feedbackEl) return;
                feedbackEl.classList.remove('hidden', 'form-error', 'form-success');
                feedbackEl.classList.add(kind);
                feedbackEl.textContent = message;
            }

            const originalLabel   = deleteListBtn.textContent;
            deleteListBtn.disabled    = true;
            deleteListBtn.textContent = 'Deleting...';

            try {
                const response = await fetch(`/lists/${window.activeListId}`, {
                    method: 'DELETE'
                });

                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }

                let data = {};
                try {
                    data = await response.json();
                } catch (_) {
                    // empty body on 200/204 is fine
                }

                if (response.ok) {
                    document
                        .querySelector(`#collab-lists-nav [data-list-id="${window.activeListId}"]`)
                        ?.closest('li')
                        ?.remove();

                    localStorage.setItem('activeListId', 'personal');
                    document.getElementById('nav-personal-btn')?.click();
                } else {
                    showFeedback('form-error', data.error || 'Only the list owner can delete this list.');
                }
            } catch (err) {
                showFeedback('form-error', 'Could not reach the server. Please try again.');
            } finally {
                deleteListBtn.disabled    = false;
                deleteListBtn.textContent = originalLabel;
            }
        });
    }
});