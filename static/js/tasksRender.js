// FILENAME: tasksRender.js

const PRIORITY_LABELS = { 1: "High", 2: "Medium", 3: "Low"};

function formatPriority(priorityValue) {
    return PRIORITY_LABELS[priorityValue] ?? "Unknown";
}

function formatDateTime(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit"
    });
}

// helper function, shows one status line above task list ( loading / empty / error )
function setTaskListMessage(text, isError = false) {
    const container = document.getElementById('task-list');
    let msgEl = document.getElementById('task-list-message');
    if(!msgEl) {
        msgEl = document.createElement('p');
        msgEl.id = 'task-list-message';
        msgEl.setAttribute('role', 'status');   // screen readers announce changes
        container.parentNode.insertBefore(msgEl, container);
    }
    msgEl.textContent   = text;
    msgEl.className     = isError ? 'form-error' : '';
    msgEl.hidden        = (text === '');
}


window.loadTasksForActiveList = async function() {
    const listId     = window.activeListId || 'personal';
    const container  = document.getElementById('task-list');

    container.innerHTML = '';       // clear previous list first
    setTaskListMessage('Loading tasks...');

    let data;
    try {
        const response = await fetch(`/tasks?list_id=${listId}`);

        if ( response.status === 401 ) {
            location.href = '/login';
            return;
        }

        data = await response.json();

        // error replies are {error: "..."}, not arrays, so stop before .map crashes
        if ( !response.ok ) {
            setTaskListMessage(data.error || 'Could not load tasks.', true);
            return;
        }
    } catch (err) {
        setTaskListMessage('Could not reach the server. Please refresh and try again.', true);
        return;
    }

    setTaskListMessage( data.length === 0 ? 'No tasks yet. Add one to get started.' : '' );

    const tasks = data.map(taskData => Task.fromJSON(taskData));

    tasks.forEach(task => {
        const li = document.createElement('li');
        li.classList.add('task-item');
        li.dataset.priority = task.getPriority();
        if ( task.getIsDone() ) {
            li.classList.add('done');
        }

        const titleEl = document.createElement('span');
        titleEl.textContent = task.getTitle();
        titleEl.classList.add('task-title');
        li.appendChild(titleEl);
        
        const dueDateTimeEl = document.createElement('span');
        dueDateTimeEl.textContent = formatDateTime(task.getDueDateTime());
        dueDateTimeEl.classList.add('task-duedate');
        li.appendChild(dueDateTimeEl);

        const tagEl = document.createElement('span');
        tagEl.textContent = task.getTag();
        tagEl.classList.add('task-tag');
        li.appendChild(tagEl);

        const isDoneEl = document.createElement('input');
        isDoneEl.type = 'checkbox';
        isDoneEl.checked = task.getIsDone();
        isDoneEl.setAttribute('aria-label', `Mark "${task.getTitle()}" as done`);
        isDoneEl.addEventListener('change', async () => {
            isDoneEl.disabled = true;           // block clicks while saving
            try {
                const resp = await fetch(`/tasks/${task.getId()}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title:        task.getTitle(),
                        due_datetime: task.getDueDateTime(),
                        priority:     task.getPriority(),
                        tag:          task.getTag(),
                        is_done:      isDoneEl.checked ? 1 : 0,
                        list_id:      task.list_id ?? (window.activeListId === 'personal' ? null : parseInt(window.activeListId))
                    })
                });

                if ( resp.status === 401 ) { location.href = '/login'; return; }

                if ( !resp.ok ) {
                    isDoneEl.checked = !isDoneEl.checked;   // undo visual change
                    setTaskListMessage('Could not update the task. Please try again.', true);
                } else {
                    li.classList.toggle('done', isDoneEl.checked);
                    setTaskListMessage('');
                }
            } catch (err) {
                isDoneEl.checked = !isDoneEl.checked;
                setTaskListMessage('Could not reach the server. Please try again.', true);
            } finally {
                isDoneEl.disabled = false;
            }
        });
        li.appendChild(isDoneEl);


        const editEl = document.createElement('button');
        editEl.textContent = "Edit Task";
        editEl.addEventListener('click', () => {
            document.getElementById('form-header').textContent  = "Edit Task";
            document.getElementById('task-name').value          = task.getTitle();
            document.getElementById('due-date-time').value      = task.getDueDateTime();
            document.getElementById('priority-select').value    = task.getPriority();
            document.getElementById('tag').value                = task.getTag();
        
            const form = document.getElementById('task-form');
            form.dataset.editingId = task.getId();
            form.dataset.editingIsDone = task.getIsDone();
            document.getElementById('submit-btn').textContent = "Update Task";
            document.getElementById('task-form-section').classList.remove('hidden');
        });
        editEl.classList.add('edit-task-btn');
        li.appendChild(editEl);

        const deleteEl = document.createElement('button');
        deleteEl.textContent = "X";
        deleteEl.setAttribute('aria-label',`Delete task ${task.getTitle()}`);
        deleteEl.addEventListener('click', async () => {
            if ( !confirm(`Delete task ${task.getTitle()}?`) ) return;

            deleteEl.disabled    = true;
            deleteEl.textContent = '...';
            try {
                const resp = await fetch(`/tasks/${task.getId()}`, { method: 'DELETE' });

                if ( resp.status === 401 ) { location.href = '/login'; return; }

                if ( resp.ok ) {
                    li.remove();
                    if ( container.children.length === 0 ) {
                        setTaskListMessage('No tasks yet. Add one to get started.');
                    }
                } else {
                    setTaskListMessage('Could not delete the task. Please try again.', true);
                }
            } catch (err) {
                setTaskListMessage('Could not reach the server. Please try again.', true);
            } finally {
                deleteEl.disabled    = false;
                deleteEl.textContent = 'X';
            }
        })
        deleteEl.classList.add('delete-task-btn');
        li.appendChild(deleteEl);

        container.appendChild(li);
    });
};

document.addEventListener('DOMContentLoaded', () => {
    window.loadTasksForActiveList();
});