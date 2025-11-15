from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, and_
from sqlalchemy.orm import Session

from database import get_db
from models import Book, BookItem, Author, AuthorBook, Publisher, Theme, BookLoan

router = APIRouter(prefix="/api/books", tags=["books"])

@router.get("/{book_id}")
async def get_book(book_id: int, db: Session = Depends(get_db)):
    try:
        book = db.query(Book).filter(Book.book_id == book_id).first()
        if not book:
            raise HTTPException(status_code=404, detail="Книга не найдена")
        
        # Получаем авторов книги
        authors = db.query(Author.author_name)\
                   .join(AuthorBook, Author.author_id == AuthorBook.author_id)\
                   .filter(AuthorBook.book_id == book_id)\
                   .all()
        
        author_names = [author.author_name for author in authors]
        
        return {
            "id": book.book_id,
            "name": book.book_name,
            "authors": ", ".join(author_names),
            "publisher": book.publisher.publisher_name if book.publisher else "",
            "isbn": book.isbn or "",
            "release_date": book.release_date or "",
            "theme": book.theme.theme_name if book.theme else ""
        }
        
    except Exception as e:
        print(f"Error getting book: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении данных книги: {str(e)}")

@router.post("/")
async def add_book(book_data: dict, db: Session = Depends(get_db)):
    try:
        import datetime
        
        # Получаем данные из запроса
        book_name = book_data.get('book_name')
        authors = book_data.get('authors', '')
        publisher = book_data.get('publisher', '')
        isbn = book_data.get('isbn', '')
        release_date = book_data.get('release_date')
        theme = book_data.get('theme', '')
        number_of_books = book_data.get('number_of_books', 1)
        
        # Проверяем обязательное поле
        if not book_name:
            raise HTTPException(status_code=400, detail="Название книги обязательно")
        
        # Преобразуем типы данных
        if release_date:
            try:
                release_date = int(release_date)
            except ValueError:
                release_date = None
            
        if number_of_books:
            try:
                number_of_books = int(number_of_books)
            except ValueError:
                number_of_books = 1
        
        # Получаем текущую дату
        acquisition_date = datetime.date.today()
        
        # Находим или создаем издателя
        publisher_obj = None
        if publisher:
            publisher_obj = db.query(Publisher).filter(Publisher.publisher_name == publisher).first()
            if not publisher_obj:
                publisher_obj = Publisher(publisher_name=publisher)
                db.add(publisher_obj)
                db.flush()  # Получаем ID
        
        # Находим или создаем тему
        theme_obj = None
        if theme:
            theme_obj = db.query(Theme).filter(Theme.theme_name == theme).first()
            if not theme_obj:
                theme_obj = Theme(theme_name=theme)
                db.add(theme_obj)
                db.flush()  # Получаем ID
        
        # Создаем книгу
        book = Book(
            book_name=book_name,
            publisher_id=publisher_obj.publisher_id if publisher_obj else None,
            isbn=isbn if isbn else None,
            release_date=release_date,
            theme_id=theme_obj.theme_id if theme_obj else None
        )
        db.add(book)
        db.flush()  # Получаем ID книги
        
        # Добавляем авторов
        if authors:
            author_names = [name.strip() for name in authors.split(',') if name.strip()]
            for author_name in author_names:
                author = db.query(Author).filter(Author.author_name == author_name).first()
                if not author:
                    author = Author(author_name=author_name)
                    db.add(author)
                    db.flush()  # Получаем ID автора
                
                # Связываем автора с книгой
                author_book = AuthorBook(author_id=author.author_id, book_id=book.book_id)
                db.add(author_book)
        
        # Создаем экземпляры книг
        for _ in range(number_of_books):
            book_item = BookItem(
                book_id=book.book_id,
                book_state='Доступна',
                acquisition_date=acquisition_date
            )
            db.add(book_item)
        
        # Сохраняем все изменения
        db.commit()
        
        return {"message": "Книга успешно добавлена"}
        
    except Exception as e:
        db.rollback()
        print(f"Error adding book: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при добавлении книги: {str(e)}")

@router.put("/{book_id}")
async def update_book(book_id: int, book_data: dict, db: Session = Depends(get_db)):
    try:
        # Находим книгу
        book = db.query(Book).filter(Book.book_id == book_id).first()
        if not book:
            raise HTTPException(status_code=404, detail="Книга не найдена")
        
        # Получаем данные из запроса
        book_name = book_data.get('book_name')
        authors = book_data.get('authors', '')
        publisher = book_data.get('publisher', '')
        isbn = book_data.get('isbn', '')
        release_date = book_data.get('release_date')
        theme = book_data.get('theme', '')
        
        # Проверяем обязательное поле
        if not book_name:
            raise HTTPException(status_code=400, detail="Название книги обязательно")
        
        # Преобразуем типы данных
        if release_date:
            try:
                release_date = int(release_date)
            except ValueError:
                release_date = None
        
        # Обновляем издателя
        publisher_obj = None
        if publisher:
            publisher_obj = db.query(Publisher).filter(Publisher.publisher_name == publisher).first()
            if not publisher_obj:
                publisher_obj = Publisher(publisher_name=publisher)
                db.add(publisher_obj)
                db.flush()
        
        # Обновляем тему
        theme_obj = None
        if theme:
            theme_obj = db.query(Theme).filter(Theme.theme_name == theme).first()
            if not theme_obj:
                theme_obj = Theme(theme_name=theme)
                db.add(theme_obj)
                db.flush()
        
        # Обновляем данные книги
        book.book_name = book_name
        book.publisher_id = publisher_obj.publisher_id if publisher_obj else None
        book.isbn = isbn if isbn else None
        book.release_date = release_date
        book.theme_id = theme_obj.theme_id if theme_obj else None
        
        # Обновляем авторов
        if authors:
            # Удаляем старых авторов
            db.query(AuthorBook).filter(AuthorBook.book_id == book_id).delete()
            
            # Добавляем новых авторов
            author_names = [name.strip() for name in authors.split(',') if name.strip()]
            for author_name in author_names:
                author = db.query(Author).filter(Author.author_name == author_name).first()
                if not author:
                    author = Author(author_name=author_name)
                    db.add(author)
                    db.flush()
                
                # Связываем автора с книгой
                author_book = AuthorBook(author_id=author.author_id, book_id=book.book_id)
                db.add(author_book)
        
        db.commit()
        
        return {"message": "Книга успешно обновлена"}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating book: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при обновлении книги: {str(e)}")

@router.delete("/{book_id}")
async def delete_book(book_id: int, db: Session = Depends(get_db)):
    try:
        # Находим книгу
        book = db.query(Book).filter(Book.book_id == book_id).first()
        if not book:
            raise HTTPException(status_code=404, detail="Книга не найдена")
        
        # Проверяем, есть ли активные займы для этой книги
        active_loans = db.query(BookLoan).join(BookItem).filter(
            BookItem.book_id == book_id,
            BookLoan.loan_return_date == None
        ).count()
        
        if active_loans > 0:
            raise HTTPException(
                status_code=400, 
                detail="Нельзя удалить книгу, у которой есть активные займы"
            )
        
        # Удаляем связи с авторами
        db.query(AuthorBook).filter(AuthorBook.book_id == book_id).delete()
        
        # Удаляем экземпляры книг
        db.query(BookItem).filter(BookItem.book_id == book_id).delete()
        
        # Удаляем саму книгу
        db.delete(book)
        db.commit()
        
        return {"message": "Книга успешно удалена"}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting book: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при удалении книги: {str(e)}")
