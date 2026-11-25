// FILENAME: ui.js
// handles add task btn, toggling form's visibility

document.addEventListener('DOMContentLoaded',function () {
    const addTaskBtn    = document.getElementById('add-task-btn');
    const formSection   = document.getElementById('task-form-section');
    const form          = document.getElementById('task-form');
    const submitBtn     = document.getElementById('submit-btn');
    const formHeader    = document.getElementById('form-header');
    const defaultHeader = formHeader.textContent;

    // one error line inside the form, created the first time it's needed
    function showFormError(message) {
        let errEl = document.getElementById('task-form-error');
        if (!errEl) {
            errEl = document.createElement('p');
            errEl.id = 'task-form-error';
            errEl.setAttribute('role', 'alert');    // screen readers announce it
            submitBtn.parentNode.insertBefore(errEl, submitBtn);
        }
        errEl.textContent   = message;
        errEl.className     ='form-error';
        errEl.hidden        = (message === '');
    }

    addTaskBtn.addEventListener('click', function () {
        formSection.classList.toggle('hidden');
        showFormError('');
        
        // reset form if closed
        if (formSection.classList.contains('hidden')) {
            form.reset();
        }
        
        delete form.dataset.editingId;
        submitBtn.textContent   = "Add Task";
        formHeader.textContent  = defaultHeader;    // fixes the stuck "Edit Task" header
    });

    form.addEventListener('submit', async function (event) {
        event.preventDefault();     // stops html page from reloading
        showFormError('');          // clear any old message
        
        // friendly check before sending anything
        const title = document.getElementById('task-name').value.trim();
        if ( !title ) {
            showFormError('Please enter a task name.');
            return;
        }
        
        // builds request payload with expected field names
        const payload = {
            title: title,
            due_datetime: document.getElementById('due-date-time').value,
            priority: document.getElementById('priority-select').value,
            tag: document.getElementById('tag').value,
            created_at: new Date().toISOString(),
            list_id: window.activeListId === 'personal' ? null : parseInt(window.activeListId)
        };

        const editingId     = form.dataset.editingId;
        const originalLabel = submitBtn.textContent;

        // loading statem blocks double-submits while request is still in-flight
        submitBtn.disabled      = true;
        submitBtn.textContent   = editingId ? 'Updating...' : 'Adding...';
        let saved               = false;
        
        try {
            // POST payload with fetch
            let response;
            if ( editingId ) {
                // editing existing task
                payload.is_done = form.dataset.editingIsDone === 'true' ? 1 : 0;
                response = await fetch(`/tasks/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                });    
            } else {
                // create new task
                response = await fetch('/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if ( response.status === 401 ) { location.href = '/login'; return; }

            if (response.ok) {
                saved = true;
                // reset edit state before reloading
                delete form.dataset.editingId;
                delete form.dataset.editingIsDone;
                submitBtn.textContent   = "Add Task";
                formHeader.textContent  = defaultHeader;
                form.reset();
                formSection.classList.add('hidden');
                window.loadTasksForActiveList();
            } else {
                // use server's message when it sent one
                let message = 'Could not save this task. Please try again.';
                try {
                    const date = await response.json();
                    if ( data.error ) message = data.error;
                } catch (e) { /* body wasn't JSON, keep the default message */}
                showFormError(message);
            }
        } catch (err) {
            showFormError('Coul not reach the server. Please try again.');
        } finally {
            submitBtn.disabled  = false;
            if ( !saved ) submitBtn.textContent = originalLabel; // success already set its own label
        }
    });
});