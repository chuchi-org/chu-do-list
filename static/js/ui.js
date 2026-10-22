// FILENAME: ui.js
// handles add task btn, toggling form's visibility

document.addEventListener('DOMContentLoaded',function () {
    const addTaskBtn    = document.getElementById('add-task-btn');
    const formSection   = document.getElementById('task-form-section');
    const form          = document.getElementById('task-form');

    addTaskBtn.addEventListener('click', function () {
        formSection.classList.toggle('hidden');
        console.log('Add button clicked.');
        
        // reset form if closed
        if (formSection.classList.contains('hidden')) {
            form.reset();
        }
        
        delete form.dataset.editingId;
        document.getElementById('submit-btn').textContent = "Add Task";
    });

    form.addEventListener('submit', async function (event) {
        event.preventDefault();     // stops html page from reloading
        
        // builds request payload with expected field names
        const payload = {
            title: document.getElementById('task-name').value,
            due_datetime: document.getElementById('due-date-time').value,
            priority: document.getElementById('priority-select').value,
            tag: document.getElementById('tag').value,
            created_at: new Date().toISOString(),
            list_id: window.activeListId === 'personal' ? null : parseInt(window.activeListId)
        };

        const editingId = form.dataset.editingId;

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

        /*
        */

        if (response.ok) {
            // reset edit state before reloading
            delete form.dataset.editingId;
            delete form.dataset.editingIsDone;
            document.getElementById('submit-btn').textContent = "Add Task";
            form.reset();
            formSection.classList.add('hidden');
            window.loadTasksForActiveList();
        } else {
            console.error('Failed to create task:', response.status);
        }
    });
});