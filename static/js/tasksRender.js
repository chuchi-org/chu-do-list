// FILENAME: tasksRender.js

const PRIORITY_LABELS = { 1: "High", 2: "Medium", 3: "Low" };

let currentListTasks = [];

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

function closeAllTaskMenus() {
    document.querySelectorAll(".task-menu-dropdown").forEach((menu) => {
        menu.classList.add("hidden");
        const btn = menu.parentElement?.querySelector(".task-menu-btn");
        if (btn) {
            btn.setAttribute("aria-expanded", "false");
        }
    });
}

function syncCardDoneState(li, isDone) {
    const done = Boolean(isDone);
    li.classList.toggle("done", done);

    const editBtn = li.querySelector(".edit-task-btn");
    if (editBtn) {
        editBtn.disabled = done;
    }
}

// helper function, shows one status line above task list ( loading / empty / error )
function setTaskListMessage(text, isError = false) {
    const container = document.getElementById('task-list');
    let msgEl = document.getElementById('task-list-message');
    if (!msgEl) {
        msgEl = document.createElement('p');
        msgEl.id = 'task-list-message';
        msgEl.setAttribute('role', 'status'); // screen readers announce changes
        container.parentNode.insertBefore(msgEl, container);
    }
    msgEl.textContent = text;
    msgEl.className = isError ? 'form-error' : '';
    msgEl.hidden = (text === '');
}

// +------- Sort + Filter -------------------+
function getSelectedTagFilters() {
    return Array.from(
        document.querySelectorAll('#task-list-filter-container input[name="filter-tag"]:checked')
    ).map((input) => input.value.trim().toLowerCase());
}

function getSelectedSort() {
    const sortEl = document.getElementById('sort-task-list');
    return sortEl ? sortEl.value.trim().toLowerCase() : 'default';
}

function getFilteredAndSortedTasks(tasks) {
    const selectedTags = getSelectedTagFilters();
    const sortVal = getSelectedSort();

    const filtered = tasks.filter((task) => {
        if (selectedTags.length === 0) {
            return true;
        }

        const rawTag = (task.getTag() ?? '').trim().toLowerCase();
        if (!rawTag || rawTag === 'none') {
            return selectedTags.includes('none');
        }

        return selectedTags.includes(rawTag);
    });

    return [...filtered].sort((a, b) => {
        if (sortVal === 'priority') {
            return (a.getPriority() ?? 99) - (b.getPriority() ?? 99);
        }

        if (sortVal === 'due_date' || sortVal === 'due-date' || sortVal === 'deadline') {
            const timeA = a.getDueDateTime() ? new Date(a.getDueDateTime()).getTime() : Infinity;
            const timeB = b.getDueDateTime() ? new Date(b.getDueDateTime()).getTime() : Infinity;
            return timeA - timeB;
        }

        if (sortVal === 'title' || sortVal === 'name') {
            return (a.getTitle() || '').localeCompare(b.getTitle() || '');
        }

        return 0; // e.g., 'date-added' / default API order
    });
}

function renderTasks(tasks) {
    const container = document.getElementById('task-list');
    container.innerHTML = ''; // clear previous list first

    if (!tasks || tasks.length === 0) {
        if (currentListTasks.length === 0) {
            setTaskListMessage('No tasks yet. Add one to get started.');
        } else {
            setTaskListMessage('No tasks match the selected tag filter.');
        }
        return;
    }

    setTaskListMessage('');

    tasks.forEach((task) => {
        const li = document.createElement('li');
        li.classList.add('task-item');
        li.dataset.priority = task.getPriority();

        const cardTop = document.createElement('div');
        cardTop.classList.add('task-card-top');

        const checkWrap = document.createElement('label');
        checkWrap.classList.add('task-check-wrap');

        const isDoneEl = document.createElement('input');
        isDoneEl.type = 'checkbox';
        isDoneEl.classList.add('task-checkbox');
        isDoneEl.checked = Boolean(task.getIsDone());
        isDoneEl.setAttribute('aria-label', `Mark "${task.getTitle()}" as done`);
        isDoneEl.addEventListener('change', async () => {
            const nextDone = isDoneEl.checked;
            isDoneEl.disabled = true; // block clicks while saving
            try {
                const resp = await fetch(`/tasks/${task.getId()}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title:        task.getTitle(),
                        due_datetime: task.getDueDateTime(),
                        priority:     task.getPriority(),
                        tag:          task.getTag(),
                        is_done:      nextDone ? 1 : 0,
                        list_id:      task.list_id ?? (window.activeListId === 'personal' ? null : parseInt(window.activeListId))
                    })
                });

                if (resp.status === 401) {
                    location.href = '/login';
                    return;
                }

                if (!resp.ok) {
                    isDoneEl.checked = !nextDone; // undo visual change
                    syncCardDoneState(li, isDoneEl.checked);
                    setTaskListMessage('Could not update the task. Please try again.', true);
                } else {
                    if (typeof task.setIsDone === 'function') {
                        task.setIsDone(nextDone ? 1 : 0);
                    } else if ('isDone' in task) {
                        task.isDone = nextDone;
                    } else {
                        task.is_done = nextDone ? 1 : 0;
                    }
                    syncCardDoneState(li, nextDone);
                    setTaskListMessage('');
                }
            } catch (err) {
                isDoneEl.checked = !nextDone;
                syncCardDoneState(li, isDoneEl.checked);
                setTaskListMessage('Could not reach the server. Please try again.', true);
            } finally {
                isDoneEl.disabled = false;
            }
        });

        const titleGroup = document.createElement('span');
        titleGroup.classList.add('task-title-group');

        const titleEl = document.createElement('strong');
        titleEl.textContent = task.getTitle();
        titleEl.classList.add('task-title');
        titleGroup.appendChild(titleEl);

        const tagValue = task.getTag();
        if (tagValue && tagValue.toLowerCase() !== 'none') {
            const tagEl = document.createElement('span');
            tagEl.textContent = tagValue;
            tagEl.classList.add('task-tag');
            titleGroup.appendChild(tagEl);
        }

        checkWrap.appendChild(isDoneEl);
        checkWrap.appendChild(titleGroup);
        cardTop.appendChild(checkWrap);

        const menuWrap = document.createElement('div');
        menuWrap.classList.add('task-menu-wrap');

        const menuBtn = document.createElement('button');
        menuBtn.type = 'button';
        menuBtn.classList.add('task-menu-btn');
        menuBtn.textContent = '⋯';
        menuBtn.setAttribute('aria-label', 'Task actions');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = menuWrap.querySelector('.task-menu-dropdown');
            const willOpen = dropdown.classList.contains('hidden');
            closeAllTaskMenus();
            if (willOpen) {
                dropdown.classList.remove('hidden');
                menuBtn.setAttribute('aria-expanded', 'true');
            }
        });

        const dropdown = document.createElement('div');
        dropdown.classList.add('task-menu-dropdown', 'hidden');
        dropdown.setAttribute('role', 'menu');

        const editEl = document.createElement('button');
        editEl.type = 'button';
        editEl.textContent = "Edit Task";
        editEl.classList.add('task-menu-item', 'edit-task-btn');
        editEl.setAttribute('role', 'menuitem');
        editEl.addEventListener('click', () => {
            if (isDoneEl.checked) return;
            closeAllTaskMenus();
            document.getElementById('form-header').textContent  = "Edit Task";
            document.getElementById('task-name').value          = task.getTitle();
            document.getElementById('due-date-time').value      = task.getDueDateTime();
            document.getElementById('priority-select').value    = task.getPriority();
            document.getElementById('tag').value                = task.getTag() || 'none';

            const form = document.getElementById('task-form');
            form.dataset.editingId = task.getId();
            form.dataset.editingIsDone = task.getIsDone();
            document.getElementById('submit-btn').textContent = "Update Task";
            document.getElementById('task-form-section').classList.remove('hidden');
        });

        const deleteEl = document.createElement('button');
        deleteEl.type = 'button';
        deleteEl.textContent = "Delete Task";
        deleteEl.classList.add('task-menu-item', 'delete-task-btn');
        deleteEl.setAttribute('role', 'menuitem');
        deleteEl.addEventListener('click', async () => {
            closeAllTaskMenus();
            if (!confirm(`Delete task ${task.getTitle()}?`)) return;

            deleteEl.disabled = true;
            const originalLabel = deleteEl.textContent;
            deleteEl.textContent = '...';
            try {
                const resp = await fetch(`/tasks/${task.getId()}`, { method: 'DELETE' });

                if (resp.status === 401) {
                    location.href = '/login';
                    return;
                }

                if (resp.ok) {
                    currentListTasks = currentListTasks.filter((t) => t.getId() !== task.getId());
                    li.remove();
                    if (container.children.length === 0) {
                        setTaskListMessage(
                            currentListTasks.length === 0
                                ? 'No tasks yet. Add one to get started.'
                                : 'No tasks match the selected tag filter.'
                        );
                    }
                } else {
                    setTaskListMessage('Could not delete the task. Please try again.', true);
                }
            } catch (err) {
                setTaskListMessage('Could not reach the server. Please try again.', true);
            } finally {
                deleteEl.disabled = false;
                deleteEl.textContent = originalLabel;
            }
        });

        dropdown.appendChild(editEl);
        dropdown.appendChild(deleteEl);
        menuWrap.appendChild(menuBtn);
        menuWrap.appendChild(dropdown);
        cardTop.appendChild(menuWrap);

        li.appendChild(cardTop);

        const formattedDate = formatDateTime(task.getDueDateTime());
        if (formattedDate) {
            const deadlineRow = document.createElement('div');
            deadlineRow.classList.add('task-deadline-row');

            const dueDateTimeEl = document.createElement('span');
            dueDateTimeEl.textContent = `Due:    ${formattedDate}`;
            dueDateTimeEl.classList.add('task-duedate');

            deadlineRow.appendChild(dueDateTimeEl);
            li.appendChild(deadlineRow);
        }

        syncCardDoneState(li, task.getIsDone());
        container.appendChild(li);
    });
}

window.loadTasksForActiveList = async function() {
    const listId    = window.activeListId || 'personal';
    const container = document.getElementById('task-list');

    container.innerHTML = ''; // clear previous list first
    setTaskListMessage('Loading tasks...');

    let data;
    try {
        const response = await fetch(`/tasks?list_id=${listId}`);

        if (response.status === 401) {
            location.href = '/login';
            return;
        }

        data = await response.json();

        // error replies are {error: "..."}, not arrays, so stop before .map crashes
        if (!response.ok) {
            setTaskListMessage(data.error || 'Could not load tasks.', true);
            return;
        }
    } catch (err) {
        setTaskListMessage('Could not reach the server. Please refresh and try again.', true);
        return;
    }

    currentListTasks = data.map((taskData) => Task.fromJSON(taskData));
    renderTasks(getFilteredAndSortedTasks(currentListTasks));
};

document.addEventListener("click", (event) => {
    if (!event.target.closest(".task-menu-wrap")) {
        closeAllTaskMenus();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const sortSelect = document.getElementById('sort-task-list');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            renderTasks(getFilteredAndSortedTasks(currentListTasks));
        });
    }

    const filterContainer = document.getElementById('task-list-filter-container');
    if (filterContainer) {
        filterContainer.addEventListener('change', () => {
            renderTasks(getFilteredAndSortedTasks(currentListTasks));
        });
    }

    window.loadTasksForActiveList();
});