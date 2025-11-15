// readers.js

// Глобальные переменные для обратной совместимости
let selectedReaderId = null;
let selectedReaderName = null;

function openAddReaderModal() {
    document.getElementById('addReaderModal').classList.remove('hidden');
    hideContextMenu();
}

function closeAddReaderModal() {
    document.getElementById('addReaderModal').classList.add('hidden');
    document.getElementById('addReaderForm').reset();
}

async function addReader(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const readerData = {
        fio: formData.get('fio'),
        dolzhnost: formData.get('dolzhnost'),
        uchenaya_stepen: formData.get('uchenaya_stepen')
    };

    try {
        const response = await fetch('/api/readers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(readerData)
        });

        if (response.ok) {
            closeAddReaderModal();
            window.location.reload();
        } else {
            const error = await response.json();
            alert('Ошибка при добавлении читателя: ' + error.detail);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Произошла ошибка при добавлении читателя');
    }
}

// Функции контекстного меню
async function editReader() {
    if (selectedItemId) {
        try {
            const response = await fetch(`/api/readers/${selectedItemId}`);
            if (!response.ok) {
                throw new Error('Ошибка загрузки данных читателя');
            }
            
            const readerData = await response.json();
            openEditReaderModal(readerData);
            
        } catch (error) {
            console.error('Error loading reader data:', error);
            alert('Ошибка при загрузке данных читателя');
        }
    }
}

async function deleteReader() {
    if (selectedItemId) {
        if (confirm('Вы уверены, что хотите удалить читателя "' + selectedItemName + '"?')) {
            try {
                const response = await fetch(`/api/readers/${selectedItemId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (response.ok) {
                    window.location.reload();
                } else {
                    const error = await response.json();
                    alert('Ошибка при удалении читателя: ' + error.detail);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Произошла ошибка при удалении читателя');
            }
        }
    }
}

function openEditReaderModal(readerData) {
    hideContextMenu();
    
    const editModal = document.getElementById('editReaderModal');
    if (!editModal) return;
    
    document.getElementById('edit_reader_id').value = readerData.id;
    document.getElementById('edit_fio').value = readerData.fio || '';
    document.getElementById('edit_dolzhnost').value = readerData.dolzhnost || '';
    document.getElementById('edit_uchenaya_stepen').value = readerData.uchenaya_stepen || '';
    
    editModal.classList.remove('hidden');
}

function closeEditReaderModal() {
    const editModal = document.getElementById('editReaderModal');
    if (editModal) {
        editModal.classList.add('hidden');
        document.getElementById('editReaderForm').reset();
    }
}

async function updateReader(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const readerId = formData.get('reader_id');
    const readerData = {
        fio: formData.get('fio'),
        dolzhnost: formData.get('dolzhnost'),
        uchenaya_stepen: formData.get('uchenaya_stepen')
    };

    try {
        const response = await fetch(`/api/readers/${readerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(readerData)
        });

        if (response.ok) {
            closeEditReaderModal();
            window.location.reload();
        } else {
            const error = await response.json();
            alert('Ошибка при обновлении читателя: ' + error.detail);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Произошла ошибка при обновлении читателя');
    }
}

async function viewReaderLoans() {
    if (selectedItemId) {
        try {
            const response = await fetch(`/api/readers/${selectedItemId}/loans`);
            if (!response.ok) {
                throw new Error('Ошибка загрузки данных о займах');
            }
            
            const loansData = await response.json();
            openViewLoansModal(loansData);
            
        } catch (error) {
            console.error('Error loading reader loans:', error);
            alert('Ошибка при загрузке данных о займах');
        }
    }
}

function openViewLoansModal(loansData) {
    hideContextMenu();

    const modal = document.getElementById('viewLoansModal');
    const title = document.getElementById('loansModalTitle');
    const tableBody = document.getElementById('loansTableBody');
    
    if (!modal || !title || !tableBody) return;
    
    title.textContent = `Займы читателя: ${loansData.reader_fio}`;
    
    if (loansData.loans.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                    У читателя нет займов
                </td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = loansData.loans.map((loan, index) => `
            <tr class="mai-table-row border-custom">
                <td class="px-6 py-4 border-custom text-center">${index + 1}</td>
                <td class="px-6 py-4 border-custom">${loan.book_name}</td>
                <td class="px-6 py-4 border-custom">${formatDate(loan.loan_date)}</td>
                <td class="px-6 py-4 border-custom">${formatDate(loan.loan_due_date)}</td>
                <td class="px-6 py-4 border-custom">${loan.loan_return_date ? formatDate(loan.loan_return_date) : '-'}</td>
                <td class="px-6 py-4 border-custom">
                    <span class="mai-status-${getStatusClass(loan.status)}">${loan.status}</span>
                </td>
                <td class="px-6 py-4 border-custom text-center">
                    ${!loan.loan_return_date ? `
                    <button onclick="returnBook(${loan.loan_id}, ${loan.book_item_id})" 
                            class="mai-btn mai-btn-sm bg-green-600 hover:bg-green-700 text-white">
                        Вернуть
                    </button>
                    ` : '-'}
                </td>
            </tr>
        `).join('');
    }
    
    modal.classList.remove('hidden');
}

function closeViewLoansModal() {
    const modal = document.getElementById('viewLoansModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function returnBook(loanId, bookItemId) {
    if (!confirm('Вы уверены, что хотите отметить книгу как возвращенную?')) {
        return;
    }

    try {
        const response = await fetch(`/api/loans/${loanId}/return`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                book_item_id: bookItemId
            })
        });

        if (response.ok) {
            viewReaderLoans();
            setTimeout(() => window.location.reload(), 1000);
        } else {
            const error = await response.json();
            alert('Ошибка при возврате книги: ' + error.detail);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Произошла ошибка при возврате книги');
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
            selectedReaderId = this.getAttribute('data-reader-id');
            selectedReaderName = this.getAttribute('data-reader-name');
        });
    });
});
