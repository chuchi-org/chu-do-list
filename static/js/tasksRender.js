// FILENAME: tasksRender.js

const PRIORITY_LABELS = { 1: "High", 2: "Medium", 3: "Low" };

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


// +------- Sort + Filter -------------------+
let currentListTasks = [];

function getSelectedTagFilters() {
    return Array.from(
        document.querySelectorAll('#task-list-filter-container input[name="filter-tag"]:checked')
    ).map((input) => input.value.trim().toLowerCase());
}

function getSelectedSort() {
    const sortEl = document.getElementById('sort-task-list');
    return sortEl ? sortEl.value.toLowerCase() : 'default';
}

function getFilteredAndSortedTasks(tasks) {
    const selectedTags = getSelectedTagFilters();
    const sortVal = getSelectedSort();

    const filtered = tasks.filter((task) => {
        // No tag checkboxes checked -> show all tasks
        if (selectedTags.length === 0) {
            return true;
        }

        const rawTag = (task.getTag() ?? '').trim().toLowerCase();
        if (!rawTag) {
            return selectedTags.includes('none');
        }

        return selectedTags.includes(rawTag);
    });

    return [...filtered].sort((a, b) => {
        if (sortVal === 'priority') {
            return (a.getPriority() ?? 99) - (b.getPriority() ?? 99);
        }

        if (sortVal === 'due_date' || sortVal === 'deadline') {
            const timeA = a.getDueDateTime() ? new Date(a.getDueDateTime()).getTime() : Infinity;
            const timeB = b.getDueDateTime() ? new Date(b.getDueDateTime()).getTime() : Infinity;
            return timeA - timeB;
        }

        if (sortVal === 'title' || sortVal === 'name') {
            return (a.getTitle() || '').localeCompare(b.getTitle() || '');
        }
        return 0;
    });
}


document.addEventListener("click", (event) => {
    if (!event.target.closest(".task-menu-wrap")) {
        closeAllTaskMenus();
    }
});

function renderTasks(tasks) {
        const container = document.getElementById('task-list');
        container.innerHTML = ''; // clears the previous item
    
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.classList.add('task-item');
            li.dataset.priority = task.getPriority();
            if (task.getIsDone()) {
                li.classList.add('done');
            }
    
            // Top row: checkbox + bold title + inline tag on left; ellipses menu on right
            const cardTop = document.createElement('div');
            cardTop.classList.add('task-card-top');
    
            const checkWrap = document.createElement('label');
            checkWrap.classList.add('task-check-wrap');
    
            const isDoneEl = document.createElement('input');
            isDoneEl.type = 'checkbox';
            isDoneEl.classList.add('task-checkbox');
            isDoneEl.setAttribute('aria-label', 'Mark task complete');
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
                
                if (!resp.ok) {
                    isDoneEl.checked = !isDoneEl.checked;
                    syncCardDoneState(li, isDoneEl.checked);
                } else {
                    const newDoneState = isDoneEl.checked ? 1 : 0;
                    if (typeof task.setIsDone === 'function') {
                        task.setIsDone(newDoneState);
                    } else {
                        task.is_done = newDoneState;
                    }
                    syncCardDoneState(li, isDoneEl.checked);
                }
            });
    
            const titleGroup = document.createElement('span');
            titleGroup.classList.add('task-title-group');
    
            const titleEl = document.createElement('strong');
            titleEl.textContent = task.getTitle();
            titleEl.classList.add('task-title');
            titleGroup.appendChild(titleEl);
    
            const tagValue = task.getTag();
            if (tagValue) {
                const tagEl = document.createElement('span');
                tagEl.textContent = tagValue;
                tagEl.classList.add('task-tag');
                titleGroup.appendChild(tagEl);
            }
    
            checkWrap.appendChild(isDoneEl);
            checkWrap.appendChild(titleGroup);
            cardTop.appendChild(checkWrap);
    
            // Top-right ellipses button + dropdown menu
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
                document.getElementById('tag').value                = task.getTag();
    
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
                if (confirm(`Delete task ${task.getTitle()}?`)) {
                    const resp = await fetch(`/tasks/${task.getId()}`, { method: 'DELETE' });
                    if (resp.ok) {
                        li.remove();
                    }
                }
            });
    
            dropdown.appendChild(editEl);
            dropdown.appendChild(deleteEl);
            menuWrap.appendChild(menuBtn);
            menuWrap.appendChild(dropdown);
            cardTop.appendChild(menuWrap);
    
            li.appendChild(cardTop);
    
            // Separate spaced row below title and tag
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
    const listId = window.activeListId || 'personal';
    const response = await fetch(`/tasks?list_id=${listId}`);

    if (response.status === 401) {
        location.href = '/login';
        return;
    }

    const data = await response.json();
    currentListTasks = data.map(taskData => Task.fromJSON(taskData));
    renderTasks(getFilteredAndSortedTasks(currentListTasks));

};

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