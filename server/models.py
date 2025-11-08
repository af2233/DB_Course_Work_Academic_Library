import enum

from sqlalchemy import Column, Integer, String, Text, Date, SmallInteger, ForeignKey, CheckConstraint, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ENUM


Base = declarative_base()

# Enum для состояний книги
class BookState(enum.Enum):
    AVAILABLE = 'Доступна'
    WRITTEN_OFF = 'Списана'
    LOST = 'Утеряна'
    ON_LOAN = 'Займ'

# Таблица издателей
class Publisher(Base):
    __tablename__ = 'publishers'
    
    publisher_id = Column(Integer, primary_key=True, autoincrement=True)
    publisher_name = Column(Text, nullable=False, unique=True)
    
    # Связи
    books = relationship("Book", back_populates="publisher")

# Таблица тем
class Theme(Base):
    __tablename__ = 'themes'
    
    theme_id = Column(Integer, primary_key=True, autoincrement=True)
    theme_name = Column(Text, unique=True)
    
    # Связи
    books = relationship("Book", back_populates="theme")

# Таблица книг
class Book(Base):
    __tablename__ = 'books'
    
    book_id = Column(Integer, primary_key=True, autoincrement=True)
    book_name = Column(Text, nullable=False)
    publisher_id = Column(Integer, ForeignKey('publishers.publisher_id'))
    isbn = Column(Text)
    release_date = Column(SmallInteger)
    theme_id = Column(Integer, ForeignKey('themes.theme_id'))
    
    # Связи
    publisher = relationship("Publisher", back_populates="books")
    theme = relationship("Theme", back_populates="books")
    book_items = relationship("BookItem", back_populates="book")
    authors = relationship("Author", secondary="author_book", back_populates="books")

# Таблица экземпляров книг
class BookItem(Base):
    __tablename__ = 'book_items'
    
    book_item_id = Column(Integer, primary_key=True, autoincrement=True)
    book_id = Column(Integer, ForeignKey('books.book_id'))
    book_state = Column(Text, default='Доступна')  # Можно использовать ENUM при необходимости
    acquisition_date = Column(Date)
    write_of_reasons = Column(Text)
    
    # Связи
    book = relationship("Book", back_populates="book_items")
    loans = relationship("BookLoan", back_populates="book_item")
    
    # Check constraint для book_state
    __table_args__ = (
        CheckConstraint(
            "book_state IN ('Доступна', 'Списана', 'Утеряна', 'Займ')",
            name='book_state_check'
        ),
    )

# Таблица авторов
class Author(Base):
    __tablename__ = 'authors'
    
    author_id = Column(Integer, primary_key=True, autoincrement=True)
    author_name = Column(Text, unique=True)
    
    # Связи
    books = relationship("Book", secondary="author_book", back_populates="authors")

# Связующая таблица авторов и книг (many-to-many)
class AuthorBook(Base):
    __tablename__ = 'author_book'
    
    author_id = Column(Integer, ForeignKey('authors.author_id'), primary_key=True)
    book_id = Column(Integer, ForeignKey('books.book_id'), primary_key=True)

# Таблица читателей
class Reader(Base):
    __tablename__ = 'readers'

    reader_id = Column(Integer, primary_key=True, autoincrement=True)
    fio = Column(Text, nullable=False, unique=True)
    dolzhnost = Column(Text)
    uchenaya_stepen = Column(Text)

    # Связи
    loans = relationship("BookLoan", back_populates="reader")

# Таблица выдачи книг
class BookLoan(Base):
    __tablename__ = 'book_loans'
    
    loan_id = Column(Integer, primary_key=True, autoincrement=True)
    loan_date = Column(Date, nullable=False)
    loan_due_date = Column(Date)
    loan_return_date = Column(Date, default=None)
    book_item_id = Column(Integer, ForeignKey('book_items.book_item_id'))
    reader_id = Column(Integer, ForeignKey('readers.reader_id'))
    
    # Связи
    book_item = relationship("BookItem", back_populates="loans")
    reader = relationship("Reader", back_populates="loans")
