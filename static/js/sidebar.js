// [FILENAME]: sidebarLists.js

window.activeListId = 'personal';

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


    // set active list state
    function setActiveList(listId, listName) {
        window.activeListId = listId;
        activeListTitle.textContent = listName;

        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

        if (listId === 'personal') {
            navPersonalBtn.classList.add('active');
            collabControls.classList.add('hidden');
        }

        else {
            const activeBtn = document.querySelector(`.nav-item[data-list-id="${listId}"]`);
            if (activeBtn) activeBtn.classList.add('active');
            collabControls.classList.remove('hidden');
        }

        closeSidebar();

        if (typeof window.loadTasksForActiveList === 'function') {
            window.loadTasksForActiveList();
        }

    }

    navPersonalBtn.addEventListener('click', () => setActiveList('personal', 'Personal Tasks'));


    // modal controls for new list
    openListModalBtn.addEventListener('click', () => createListModal.classList.remove('hidden'));
    closeListModalBtn.addEventListener('click', () => createListModal.classList.add('hidden'));

    createListForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const listNameInput = document.getElementById('new-list-name');
        const listName      = listNameInput.value.trim();
        const errorEl       = document.getElementById('create-list-error');

        // loading state on Create button
        const submitBtn     = createListForm.querySelector('.submit-modal-btn');
        const originalLabel = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.disabled      = true;
            submitBtn.textContent   = 'Creating...';
        }
        
        // try/catch/finally so failures are handled and button always recovers
        try {
            const response = await fetch('/lists', {
                method:    'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: listName })
            });

            if ( response.status === 401 ) { location.href = '/login'; return; }

            const data = await response.json();

            if ( response.ok ) {
                createListModal.classList.add('hidden');
                createListForm.reset();
                errorEl.classList.add('hidden');
                await loadUserLists();
                setActiveList(data.id.toString(), data.name);
            } else {
                errorEl.textContent = data.error || 'Failed to create list';
                errorEl.classList.remove('hidden');
            }
        } catch (err) {
            errorEl.textContent = 'Could not reach the server. Please try again.';
            errorEl.classList.remove('hidden');
        } finally {
            if (submitBtn) {
                submitBtn.disabled      = false;
                submitBtn.textContent   = originalLabel; 
            }
        }
    });

    // helper: one line of text in the sidebar list area (empty / error)
    function showListMessage(text, isError = false) {
        collabListsNav.innerHTML = '';
        const li = document.createElement('li');
        li.textContent = text;
        if (isError) lis.classList.add('form-error');
        collabListsNav.appendChild(li);
    }

    // load collaborative lists into sidebar
    async function loadUserLists() {
        try {
            const response = await fetch('/lists');
            
            if ( response.status === 401 ) { location.href = '/login'; return; }
            
            if ( !response.ok ) {
                showListMessage('Could not load your lists.', true);
                return;
            }
    
            const lists = await response.json();
            collabListsNav.innerHTML = '';
            
            if ( lists.length === 0 ) {
                showListMessage('No shared lists yet.');
                return;
            }
            lists.forEach(list => {
                const li  = document.createElement('li');
                const btn = document.createElement('button');
                btn.classList.add('nav-item');
                btn.dataset.listId = list.id;
                btn.textContent = list.name;
        
                btn.addEventListener('click', () => setActiveList(list.id.toString(), list.name));
                li.appendChild(btn);
                collabListsNav.appendChild(li);
            });
        } catch (err) {
            showListMessage('Could not reach the server.', true);
        }
    }
    
    loadUserLists();
});

