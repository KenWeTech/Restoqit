document.addEventListener('DOMContentLoaded', () => {

    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('is-open');

            if (window.innerWidth >= 768) {
                mainContent.classList.toggle('sidebar-is-open');
            }
        });
    }

    const clockElement = document.getElementById('clock');
    if (clockElement) {
        const updateClock = () => {
            const now = new Date();

            const dateFormat = clockElement.dataset.dateFormat || 'YYYY-MM-DD';
            const timeFormat = clockElement.dataset.timeFormat || 'HH:mm';
            const timeZone = clockElement.dataset.timezone;

            const options = (timeZone && timeZone.trim()) ? { timeZone: timeZone.trim() } : {};

            const parts = new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                ...options
            }).formatToParts(now);

            const dateParts = {};
            parts.forEach(p => {
                if (p.type !== 'literal') dateParts[p.type] = p.value;
            });

            const { year, month, day } = dateParts;

            let dateString = '';
            switch (dateFormat) {
                case 'YYYY-MM-DD':
                    dateString = `${year}-${month}-${day}`;
                    break;
                case 'MM-DD-YYYY':
                    dateString = `${month}-${day}-${year}`;
                    break;
                case 'DD-MM-YYYY':
                    dateString = `${day}-${month}-${year}`;
                    break;
                default:
                    dateString = now.toLocaleDateString('en-US', options);
            }

            let timeString = '';
            if (timeFormat === 'hh:mm AM/PM') {
                timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, ...options });
            } else {
                timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, ...options });
            }

            clockElement.textContent = `${dateString} | ${timeString}`;
        };
        updateClock();
        setInterval(updateClock, 1000);
    }

    if (window.location.pathname === '/') {
        if (typeof checkInterval !== 'undefined' && checkInterval > 0) {
            setTimeout(() => {
                window.location.reload();
            }, checkInterval);
        }
    }

    function escapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    const selectElement = document.getElementById('shopping-list-select');
    const listItemsContainer = document.getElementById('grocery-list-items');
    const noItemsMessage = document.getElementById('no-items-message');

    if (selectElement && listItemsContainer) {

        const renderList = (items) => {
            listItemsContainer.innerHTML = '';
            if (Array.isArray(items) && items.length > 0) {
                if (noItemsMessage) noItemsMessage.classList.add('hidden');
                items.forEach(item => {
                    const li = document.createElement('li');
                    li.classList.add('grocery-item');

                    if (item.id) li.dataset.id = item.id;
                    if (item.product_id) li.dataset.productId = item.product_id;
                    li.dataset.amount = item.amount || 1;

                    const name = item.note || item.product_name || 'Unknown Item';
                    const amount = item.amount || 1;

                    li.innerHTML = `
                        <div class="item-info">
                            <span class="item-name">${escapeHtml(name)}</span>
                            <span class="item-detail">Quantity: ${escapeHtml(amount.toString())}</span>
                        </div>
                    `;
                    if (item.tapped) {
                        li.classList.add('tapped');
                    }
                    listItemsContainer.appendChild(li);
                });
            } else {
                if (noItemsMessage) noItemsMessage.classList.remove('hidden');
                listItemsContainer.innerHTML = '';
            }
        };

        async function fetchListAndRender(listId) {
            if (!listId) return;

            listItemsContainer.innerHTML = '<p>Loading list...</p>';
            if (noItemsMessage) noItemsMessage.classList.add('hidden');

            try {
                const response = await fetch(`/api/grocery-list-items?list_id=${listId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch list items');
                }
                const data = await response.json();
                const rawItems = Array.isArray(data.groceryList) ? data.groceryList : [];

                const savedTapped = JSON.parse(localStorage.getItem(`tapped-list-${listId}`)) || {};

                const listData = rawItems.map(item => ({
                    ...item,
                    tapped: !!savedTapped[item.id]
                }));

                renderList(listData);
            } catch (error) {
                console.error('Error fetching list:', error);
                listItemsContainer.innerHTML = '<p>Error loading list. Please try again.</p>';
            }
        }

        listItemsContainer.addEventListener('click', (event) => {
            const clickedItem = event.target.closest('li.grocery-item');
            if (clickedItem) {
                clickedItem.classList.toggle('tapped');

                const listId = selectElement.value;
                const itemId = clickedItem.dataset.id;

                if (listId && itemId) {
                    const savedTapped = JSON.parse(localStorage.getItem(`tapped-list-${listId}`)) || {};
                    savedTapped[itemId] = clickedItem.classList.contains('tapped');
                    localStorage.setItem(`tapped-list-${listId}`, JSON.stringify(savedTapped));
                }
            }
        });

        selectElement.addEventListener('change', (event) => {
            const selectedListId = event.target.value;
            localStorage.setItem('selectedListId', selectedListId);
            fetchListAndRender(selectedListId);
        });

        const storedListId = localStorage.getItem('selectedListId');
        if (storedListId && selectElement.querySelector(`option[value="${storedListId}"]`)) {
            selectElement.value = storedListId;
        } else if (selectElement.options.length > 0) {
            selectElement.value = selectElement.options[0].value;
        }

        if (selectElement.value) {
            fetchListAndRender(selectElement.value);
        }
    }

    const toggleButton = document.getElementById('dark-mode-toggle');
    const body = document.body;
    const currentTheme = localStorage.getItem('theme');

    const updateToggleUI = () => {
        if (!toggleButton) return;
        const isDark = body.classList.contains('dark-mode');

        toggleButton.textContent = isDark ? '☀️' : '🌙';
    };

    if (currentTheme === 'dark-mode' || currentTheme === 'dark') {
        body.classList.add('dark-mode');
    }

    updateToggleUI();

    if (toggleButton) {
        toggleButton.addEventListener('click', (e) => {
            e.preventDefault();
            body.classList.toggle('dark-mode');

            const isDark = body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark-mode' : 'light');

            updateToggleUI();
        });
    }

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered: ', registration);
            })
            .catch(registrationError => {
                console.log('Service Worker registration failed: ', registrationError);
            });
        });
    }

    async function handleStockAction(e) {
    const button = e.target;
    if (!button.classList.contains('btn-add-list') && !button.classList.contains('btn-remove-spoiled')) {
        return;
    }

    const li = button.closest('li');
    const { productId, stockId, amount } = li.dataset;

    let endpoint = '';
    let body = {};

    if (button.classList.contains('btn-add-list')) {
        const select = li.querySelector('.action-shopping-list');
        const selectedListId = select ? select.value : null;

        if (!selectedListId) {
            alert('Please select a list.');
            return;
        }

        endpoint = '/api/stock/add-to-list';
        body = { productId, listId: selectedListId };

    } else if (button.classList.contains('btn-remove-spoiled')) {
        const confirmed = confirm('Are you sure you want to remove this item? This will mark it as spoiled and remove it from your stock.');
        if (!confirmed) {
            return;
        }

        endpoint = '/api/stock/remove-spoiled';
        body = { productId, stockId, amount };
    }

    try {
        button.disabled = true;
        button.textContent = '...';

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            if (button.classList.contains('btn-add-list')) {

                if (body.listId) {
                    localStorage.removeItem(`grocery-list-${body.listId}`);
                }
                button.textContent = 'Added!';
                setTimeout(() => {
                    button.textContent = 'Add to List';
                    button.disabled = false;
                }, 2000);
            } else {

                li.style.opacity = '0';
                setTimeout(() => li.remove(), 300);
            }
        } else {
            throw new Error('Action failed');
        }

    } catch (error) {
        console.error('Error performing stock action:', error);
        button.textContent = 'Error!';
        button.style.backgroundColor = 'var(--expired-color)';
        setTimeout(() => {
            button.disabled = false;
            if (button.classList.contains('btn-add-list')) {
                button.textContent = 'Add to List';
            } else {
                button.textContent = 'Remove (Spoil)';
            }
            button.style.backgroundColor = '';
        }, 3000);
    }
}

    document.getElementById('expired-list')?.addEventListener('click', handleStockAction);
    document.getElementById('expiring-list')?.addEventListener('click', handleStockAction);
    document.getElementById('low-stock-list')?.addEventListener('click', handleStockAction);
});
