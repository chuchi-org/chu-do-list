// [FILENAME]: sidebar.js

window.activeListId = 'personal';
window.activeListIsOwner = false;

function resolveIsOwner(listOrData, fallback = false) {
    if (!listOrData) return fallback;
    if (typeof listOrData.is_owner === 'boolean') return listOrData.is_owner;
    if (listOrData.role === 'owner') return true;

    const currentUserId =
        window.currentUserId ??
        sessionStorage.getItem('user_id') ??
        localStorage.getItem('user_id');

    if (currentUserId != null && listOrData.owner_id != null) {
        return Number(listOrData.owner_id) === Number(currentUserId);
    }

    return fallback;
}

document.addEventListener('DOMContentLoaded', () => {
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const closeSideBarBtn  = document.getElementById('close-sidebar-btn');
    const sidebar          = document.getElementById('sidebar');
    const sidebarOverlay   = document.getElementById('sidebar-overlay');

    const navPersonalBtn   = document.getElementById('nav-personal-btn');
    const collabListsNav   = document.getElementById('collab-lists-nav');
    const activeListTitle  = document.getElementById('active-list-title');
    const collabControls   = document.getElementById('collab-header-controls');

    const openListModalBtn  = document.getElementById('open-create-list-modal-btn');
    const closeListModalBtn = document.getElementById('close-list-modal-btn');
    const createListModal   = document.getElementById('create-list-modal');
    const createListForm    = document.getElementById('create-list-form');
    const logoutBtn         = document.getElementById('logout-btn');

    // sidebar open/close
    function openSidebar() {
        sidebar.classList.remove('hidden');
        sidebarOverlay.classList.remove('hidden');
    }

    function closeSidebar() {
        sidebar.classList.add('hidden');
        sidebarOverlay.classList.add('hidden');
    }

    toggleSidebarBtn.addEventListener('click', openSidebar);
    closeSideBarBtn.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    // logout handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const response = await fetch('/logout', { method: 'POST' });
            if (response.ok) location.href = '/login';
        });
    }

    // syncs active list ID, owner flag, and header ⋯ menu visibility
    window.setActiveListContext = function ({ id, isOwner }) {
        window.activeListId = id;
        window.activeListIsOwner = Boolean(isOwner);

        const menuWrap = document.getElementById('list-menu-wrap');
        const menuBtn  = document.getElementById('list-menu-btn');
        const dropdown = document.getElementById('list-menu-dropdown');

        if (dropdown) dropdown.classList.add('hidden');
        if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');

        if (menuWrap) {
            const canDeleteList = Boolean(id && id !== 'personal' && window.activeListIsOwner);
            menuWrap.classList.toggle('hidden', !canDeleteList);
        }
    };

    // set active list state
    function setActiveList(listId, listName, isOwner = false) {
        window.setActiveListContext({ id: listId, isOwner });
        activeListTitle.textContent = listName;

        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

        if (listId === 'personal') {
            navPersonalBtn.classList.add('active');
            collabControls.classList.add('hidden');
        } else {
            const activeBtn = document.querySelector(`.nav-item[data-list-id="${listId}"]`);
            if (activeBtn) activeBtn.classList.add('active');
            collabControls.classList.remove('hidden');
        }

        closeSidebar();

        if (typeof window.loadTasksForActiveList === 'function') {
            window.loadTasksForActiveList();
        }
    }

    navPersonalBtn.addEventListener('click', () => setActiveList('personal', 'Personal Tasks', false));

    // modal controls for new list
    openListModalBtn.addEventListener('click', () => createListModal.classList.remove('hidden'));
    closeListModalBtn.addEventListener('click', () => createListModal.classList.add('hidden'));

    createListForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const listNameInput = document.getElementById('new-list-name');
        const listName      = listNameInput.value.trim();
        const errorEl       = document.getElementById('create-list-error');

        const response = await fetch('/lists', {
            method:    'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: listName })
        });

        const data = await response.json();

        if (response.ok) {
            createListModal.classList.add('hidden');
            createListForm.reset();
            errorEl.classList.add('hidden');
            await loadUserLists();

            const isOwner = resolveIsOwner(data, true);
            setActiveList(data.id.toString(), data.name, isOwner);
        } else {
            errorEl.textContent = data.error || 'Failed to create list';
            errorEl.classList.remove('hidden');
        }
    });

    // load collaborative lists into sidebar
    async function loadUserLists() {
        const response = await fetch('/lists');
        if (!response.ok) return;

        const lists = await response.json();
        collabListsNav.innerHTML = '';

        lists.forEach(list => {
            const li  = document.createElement('li');
            const btn = document.createElement('button');
            btn.classList.add('nav-item');
            btn.dataset.listId = list.id;
            btn.textContent = list.name;

            const isOwner = resolveIsOwner(list, false);
            btn.dataset.isOwner = String(isOwner);

            btn.addEventListener('click', () => setActiveList(list.id.toString(), list.name, isOwner));
            li.appendChild(btn);
            collabListsNav.appendChild(li);
        });
    }

    loadUserLists();
});