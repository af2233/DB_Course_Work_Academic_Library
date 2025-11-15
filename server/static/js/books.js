// books.js

// Глобальные переменные для обратной совместимости
let selectedBookId = null;
let selectedBookName = null;

function openAddBookModal() {
    document.getElementById('addBookModal').classList.remove('hidden');
    hideContextMenu();
}

function closeAddBookModal() {
    document.getElementById('addBookModal').classList.add('hidden');
    document.getElementById('addBookForm').reset();
}

async function addBook(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const bookData = {
        book_name: formData.get('book_name'),
        authors: formData.get('authors'),
        publisher: formData.get('publisher'),
        isbn: formData.get('isbn'),
        release_date: formData.get('release_date'),
        theme: formData.get('theme'),
        number_of_books: formData.get('number_of_books')
    };

    try {
        const response = await fetch('/api/books', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookData)
        });

        if (response.ok) {
            closeAddBookModal();
            window.location.reload();
        } else {
            const error = await response.json();
            alert('Ошибка при добавлении книги: ' + error.detail);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Произошла ошибка при добавлении книги');
    }
}

// Функции контекстного меню
async function editBook() {
    if (selectedItemId) {
        try {
            const response = await fetch(`/api/books/${selectedItemId}`);
            if (!response.ok) {
                throw new Error('Ошибка загрузки данных книги');
            }
            
            const bookData = await response.json();
            openEditBookModal(bookData);
            
        } catch (error) {
            console.error('Error loading book data:', error);
            alert('Ошибка при загрузке данных книги');
        }
    }
}

async function deleteBook() {
    if (selectedItemId) {
        if (confirm('Вы уверены, что хотите удалить книгу "' + selectedItemName + '"?')) {
            try {
                const response = await fetch(`/api/books/${selectedItemId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (response.ok) {
                    window.location.reload();
                } else {
                    const error = await response.json();
                    alert('Ошибка при удалении книги: ' + error.detail);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Произошла ошибка при удалении книги');
            }
        }
    }
}

// Функция для открытия модального окна редактирования
function openEditBookModal(bookData) {
    hideContextMenu();
    
    let editModal = document.getElementById('editBookModal');
    
    if (!editModal) {
        editModal = document.createElement('div');
        editModal.id = 'editBookModal';
        editModal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full hidden z-50';
        editModal.innerHTML = `
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Редактировать книгу</h3>
                    
                    <form id="editBookForm" onsubmit="updateBook(event)">
                        <input type="hidden" id="edit_book_id" name="book_id">
                        <div class="mb-4">
                            <label for="edit_book_name" class="block text-sm font-medium text-gray-700 mb-1">
                                Название книги *
                            </label>
                            <input type="text" id="edit_book_name" name="book_name" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>

                        <div class="mb-4">
                            <label for="edit_authors" class="block text-sm font-medium text-gray-700 mb-1">
                                Авторы (через запятую)
                            </label>
                            <input type="text" id="edit_authors" name="authors"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                   placeholder="Иван Иванов, Петр Петров">
                        </div>

                        <div class="mb-4">
                            <label for="edit_publisher" class="block text-sm font-medium text-gray-700 mb-1">
                                Издатель
                            </label>
                            <input type="text" id="edit_publisher" name="publisher"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>

                        <div class="mb-4">
                            <label for="edit_isbn" class="block text-sm font-medium text-gray-700 mb-1">
                                ISBN
                            </label>
                            <input type="text" id="edit_isbn" name="isbn"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>

                        <div class="mb-4">
                            <label for="edit_release_date" class="block text-sm font-medium text-gray-700 mb-1">
                                Год выпуска
                            </label>
                            <input type="number" id="edit_release_date" name="release_date" min="1900" max="2030"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>

                        <div class="mb-4">
                            <label for="edit_theme" class="block text-sm font-medium text-gray-700 mb-1">
                                Тема
                            </label>
                            <input type="text" id="edit_theme" name="theme"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>

                        <div class="flex items-center justify-end gap-3 mt-6">
                            <button type="button" onclick="closeEditBookModal()" 
                                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500">
                                Отмена
                            </button>
                            <button type="submit" 
                                    class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                Сохранить изменения
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(editModal);
        
        editModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeEditBookModal();
            }
        });
    }
    
    document.getElementById('edit_book_id').value = bookData.id;
    document.getElementById('edit_book_name').value = bookData.name || '';
    document.getElementById('edit_authors').value = bookData.authors || '';
    document.getElementById('edit_publisher').value = bookData.publisher || '';
    document.getElementById('edit_isbn').value = bookData.isbn || '';
    document.getElementById('edit_release_date').value = bookData.release_date || '';
    document.getElementById('edit_theme').value = bookData.theme || '';
    
    editModal.classList.remove('hidden');
}

function closeEditBookModal() {
    const editModal = document.getElementById('editBookModal');
    if (editModal) {
        editModal.classList.add('hidden');
        document.getElementById('editBookForm').reset();
    }
}

async function updateBook(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const bookId = formData.get('book_id');
    const bookData = {
        book_name: formData.get('book_name'),
        authors: formData.get('authors'),
        publisher: formData.get('publisher'),
        isbn: formData.get('isbn'),
        release_date: formData.get('release_date'),
        theme: formData.get('theme')
    };

    try {
        const response = await fetch(`/api/books/${bookId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookData)
        });

        if (response.ok) {
            closeEditBookModal();
            window.location.reload();
        } else {
            const error = await response.json();
            alert('Ошибка при обновлении книги: ' + error.detail);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Произошла ошибка при обновлении книги');
    }
}

function openLoanBookModal() {
    if (!selectedItemId) return;
    
    hideContextMenu();
    
    let loanModal = document.getElementById('loanBookModal');
    
    if (!loanModal) {
        loanModal = document.createElement('div');
        loanModal.id = 'loanBookModal';
        loanModal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full hidden z-50';
        loanModal.innerHTML = `
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Выдать книгу</h3>
                    <p class="text-sm text-gray-600 mb-4" id="loanBookTitle">Книга: <span id="selectedBookName"></span></p>
                    
                    <form id="loanBookForm" onsubmit="processBookLoan(event)">
                        <input type="hidden" id="loan_book_id" name="book_id">
                        
                        <div class="mb-4">
                            <label for="reader_fio" class="block text-sm font-medium text-gray-700 mb-1">
                                ФИО читателя *
                            </label>
                            <input type="text" id="reader_fio" name="reader_fio" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                   placeholder="Иванов Иван Иванович">
                        </div>

                        <div class="mb-4">
                            <label for="loan_due_date" class="block text-sm font-medium text-gray-700 mb-1">
                                Дата возврата *
                            </label>
                            <input type="date" id="loan_due_date" name="loan_due_date" required
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                   min="${new Date().toISOString().split('T')[0]}">
                        </div>

                        <div class="flex items-center justify-end gap-3 mt-6">
                            <button type="button" onclick="closeLoanBookModal()" 
                                    class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500">
                                Отмена
                            </button>
                            <button type="submit" 
                                    class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                Выдать книгу
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(loanModal);
        
        loanModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeLoanBookModal();
            }
        });
    }
    
    document.getElementById('loan_book_id').value = selectedItemId;
    document.getElementById('selectedBookName').textContent = selectedItemName;
    
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 1);
    document.getElementById('loan_due_date').min = minDate.toISOString().split('T')[0];
    
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 14);
    document.getElementById('loan_due_date').value = defaultDueDate.toISOString().split('T')[0];
    
    loanModal.classList.remove('hidden');
}

function closeLoanBookModal() {
    const loanModal = document.getElementById('loanBookModal');
    if (loanModal) {
        loanModal.classList.add('hidden');
        document.getElementById('loanBookForm').reset();
    }
}

async function processBookLoan(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const bookId = formData.get('book_id');
    const loanData = {
        reader_fio: formData.get('reader_fio'),
        loan_due_date: formData.get('loan_due_date')
    };

    try {
        const response = await fetch(`/api/books/${bookId}/loan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loanData)
        });

        if (response.ok) {
            const result = await response.json();
            closeLoanBookModal();
            window.location.reload();
        } else {
            const error = await response.json();
            alert('Ошибка при выдаче книги: ' + error.detail);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Произошла ошибка при выдаче книги');
    }
}

function loanBook() {
    if (selectedItemId) {
        openLoanBookModal();
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initContextMenu();
    initModalCloseHandlers();
    
    // Для обратной совместимости - обновляем глобальные переменные
    const contextMenuTriggers = document.querySelectorAll('.context-menu-trigger');
    contextMenuTriggers.forEach(trigger => {
        trigger.addEventListener('contextmenu', function(e) {
            selectedBookId = this.getAttribute('data-book-id');
            selectedBookName = this.getAttribute('data-book-name');
        });
    });
});
