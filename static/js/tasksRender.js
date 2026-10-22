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


window.loadTasksForActiveList = async function() {
    const listId = window.activeListId || 'personal';
    const response = await fetch(`/tasks?list_id=${listId}`);

    if ( response.status === 401 ) {
        location.href = '/login';
        return;
    }

    const data  = await response.json();
    const tasks = data.map(taskData => Task.fromJSON(taskData));
    const container = document.getElementById('task-list');
    container.innerHTML = '';   // clears the previous item

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
        isDoneEl.addEventListener('change', async () => {
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

            if ( !resp.ok ) {
                isDoneEl.checked = !isDoneEl.checked;
            }

            else {
                li.classList.toggle('done', isDoneEl.checked);
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
        deleteEl.addEventListener('click', async () => {
            if (confirm(`Delete task ${task.getTitle()}?`)) {
                const resp = await fetch(`/tasks/${task.getId()}`, { method: 'DELETE' });
                if (resp.ok) {
                    li.remove();
                }
            }
        });
        deleteEl.classList.add('delete-task-btn');
        li.appendChild(deleteEl);

        container.appendChild(li);
    });
};

document.addEventListener('DOMContentLoaded', () => {
    window.loadTasksForActiveList();
});