// context-menu.js - общие функции для работы с контекстным меню

let selectedItemId = null;
let selectedItemName = null;
let selectedItemType = null; // 'book' или 'reader'

// Функция для скрытия контекстного меню
function hideContextMenu() {
    const contextMenu = document.getElementById('contextMenu');
    if (contextMenu) {
        contextMenu.style.display = 'none';
    }
}

// Инициализация контекстного меню
function initContextMenu(contextMenuId = 'contextMenu') {
    const contextMenuTriggers = document.querySelectorAll('.context-menu-trigger');
    const contextMenu = document.getElementById(contextMenuId);
    
    if (!contextMenu) {
        console.warn('Context menu element not found:', contextMenuId);
        return;
    }
    
    contextMenuTriggers.forEach(trigger => {
        trigger.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Получаем данные элемента
            selectedItemId = this.getAttribute('data-book-id') || 
                           this.getAttribute('data-reader-id');
            
            selectedItemName = this.getAttribute('data-book-name') || 
                             this.getAttribute('data-reader-name');
            
            // Определяем тип элемента
            if (this.getAttribute('data-book-id')) {
                selectedItemType = 'book';
            } else if (this.getAttribute('data-reader-id')) {
                selectedItemType = 'reader';
            }
            
            console.log('Context menu triggered:', { selectedItemId, selectedItemName, selectedItemType });
            
            // Позиционирование меню
            contextMenu.style.display = 'block';
            contextMenu.style.left = e.pageX + 'px';
            contextMenu.style.top = e.pageY + 'px';
        });
    });
    
    // Скрыть меню при клике вне его
    document.addEventListener('click', function(e) {
        if (!contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });
    
    // Предотвратить скрытие при клике внутри меню
    contextMenu.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

// Функция для закрытия модальных окон по клику вне их
function initModalCloseHandlers() {
    // Закрытие модальных окон при клике вне их
    const modals = document.querySelectorAll('.fixed.inset-0');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.add('hidden');
                
                // Сбрасываем формы внутри модального окна
                const form = this.querySelector('form');
                if (form) {
                    form.reset();
                }
            }
        });
    });
}

// Вспомогательная функция для форматирования даты
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    } catch (e) {
        return dateString;
    }
}

// Вспомогательная функция для определения класса статуса
function getStatusClass(status) {
    if (!status) return 'available';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('на руках') || statusLower.includes('возвращена') || statusLower.includes('доступна')) {
        return 'available';
    } else if (statusLower.includes('просрочен') || statusLower.includes('опозданием') || statusLower.includes('утерян') || statusLower.includes('списан')) {
        return 'warning';
    } else if (statusLower.includes('займ')) {
        return 'info';
    } else {
        return 'available';
    }
}

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
    // Создаем контейнер для уведомлений, если его нет
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(notificationContainer);
    }
    
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : 
                   type === 'success' ? 'bg-green-500' : 'bg-blue-500';
    
    notification.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg transform transition-transform duration-300`;
    notification.textContent = message;
    
    notificationContainer.appendChild(notification);
    
    // Автоматическое скрытие через 5 секунд
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// Функция для обработки ошибок API
async function handleApiError(response, defaultMessage = 'Произошла ошибка') {
    if (response.ok) return true;
    
    try {
        const error = await response.json();
        showNotification(error.detail || defaultMessage, 'error');
    } catch (e) {
        showNotification(defaultMessage, 'error');
    }
    return false;
}

// Функция для выполнения API запросов с обработкой ошибок
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            await handleApiError(response);
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request error:', error);
        showNotification('Ошибка соединения', 'error');
        return null;
    }
}
