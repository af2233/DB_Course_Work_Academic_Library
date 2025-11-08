document.getElementById('searchInput').addEventListener('input', function (event) {
    const searchTerm = event.target.value.toLowerCase();
    const listItems = document.querySelectorAll('#book_rows tr');

    listItems.forEach(function (item) {
        const bookNameCell = item.querySelector('.book-name-cell');
        const bookName = bookNameCell.textContent.toLowerCase();
        if (bookName.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
});