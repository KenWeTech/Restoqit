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

            const options = { timeZone: timeZone };

            let dateString = '';
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');

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

    const selectElement = document.getElementById('shopping-list-select');
    const listItemsContainer = document.getElementById('grocery-list-items');
    const noItemsMessage = document.getElementById('no-items-message');

    if (selectElement && listItemsContainer) {

        const renderList = (items) => {
            listItemsContainer.innerHTML = '';
            if (items.length > 0) {
                if (noItemsMessage) noItemsMessage.classList.add('hidden');
                items.forEach(item => {
                    const li = document.createElement('li');
                    li.classList.add('grocery-item');
                    li.innerHTML = `
                        <span class="item-name">${item.note || item.product_name}</span>
                        <span class="item-detail">${item.amount || ''}</span>
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
            const cachedData = localStorage.getItem(`grocery-list-${listId}`);
            let listData;

            if (cachedData) {
                console.log('Loading list from cache.');
                listData = JSON.parse(cachedData);
            } else {
                listItemsContainer.innerHTML = '<p>Loading list...</p>';
                if (noItemsMessage) noItemsMessage.classList.add('hidden');

                try {
                    const response = await fetch(`/api/grocery-list-items?list_id=${listId}`);
                    if (!response.ok) {
                        throw new Error('Failed to fetch list items');
                    }
                    const data = await response.json();
                    listData = data.groceryList.map(item => ({ ...item, tapped: false }));
                    localStorage.setItem(`grocery-list-${listId}`, JSON.stringify(listData));
                } catch (error) {
                    console.error('Error fetching list:', error);
                    listItemsContainer.innerHTML = '<p>Error loading list. Please try again.</p>';
                    return;
                }
            }
            renderList(listData);
        }

        listItemsContainer.addEventListener('click', (event) => {
            const clickedItem = event.target.closest('li.grocery-item');
            if (clickedItem) {
                clickedItem.classList.toggle('tapped');

                const listId = selectElement.value;
                const listData = JSON.parse(localStorage.getItem(`grocery-list-${listId}`));
                if (listData) {
                    const itemIndex = Array.from(listItemsContainer.children).indexOf(clickedItem);
                    if (itemIndex > -1) {
                        listData[itemIndex].tapped = clickedItem.classList.contains('tapped');
                        localStorage.setItem(`grocery-list-${listId}`, JSON.stringify(listData));
                    }
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

    if (currentTheme) {
        body.classList.add(currentTheme);
    }

    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            let theme = 'light';
            if (body.classList.contains('dark-mode')) {
                theme = 'dark-mode';
            }
            localStorage.setItem('theme', theme);
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
});
