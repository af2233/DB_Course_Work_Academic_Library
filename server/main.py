from fastapi import FastAPI, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse

from sqlalchemy import and_, func

from database import get_db
from models import *


app = FastAPI()
app.add_middleware(GZipMiddleware, minimum_size=500)
app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
async def home_page(request: Request, db = Depends(get_db)):
    try:
        # Получаем статистику
        total_books = db.query(func.count(Book.book_id)).scalar()
        total_available = db.query(func.count(BookItem.book_item_id)).filter(BookItem.book_state == 'Доступна').scalar()
        total_readers = db.query(func.count(Reader.reader_id)).scalar()
        active_loans = db.query(func.count(BookLoan.loan_id)).filter(BookLoan.loan_return_date == None).scalar()

        stats = {
            "total_books": total_books,
            "total_available": total_available,
            "total_readers": total_readers,
            "active_loans": active_loans
        }

        return templates.TemplateResponse(
            request=request, name="homepage.html", context={"stats": stats}
        )

    except Exception as e:
        print(e)
        return "<h1>Server Error: Could not load data.</h1>"


@app.get("/books", response_class=HTMLResponse)
async def books_route(request: Request, search: str = "", db = Depends(get_db)):
    try:
        search_param = f"{search.strip()}%"
        
        query = db.query(
            Book.book_name,
            Theme.theme_name,
            Publisher.publisher_name,
            Book.release_date,
            Book.isbn,
            func.count(BookItem.book_item_id).label('available_book_count')
        ).join(Publisher, Book.publisher_id == Publisher.publisher_id)\
         .join(Theme, Book.theme_id == Theme.theme_id)\
         .join(BookItem, Book.book_id == BookItem.book_id)\
         .filter(Book.book_name.ilike(search_param))\
         .filter(BookItem.book_state == 'Доступна')\
         .group_by(
             Book.book_name, 
             Theme.theme_name, 
             Publisher.publisher_name, 
             Book.release_date, 
             Book.isbn
         )
        
        values = query.all()
        
        books = []
        for row in values:
            books.append({
                "name": row.book_name,
                "theme": row.theme_name,
                "publisher": row.publisher_name,
                "release_date": row.release_date,
                "isbn": row.isbn,
                "available_book_count": row.available_book_count
            })
        
        return templates.TemplateResponse(request=request, name="books.html", context={"books": books, "search": search})
        
    except Exception as e:
        print(e)
        return "<h1>Server Error: Could not load books data.</h1>"


@app.get("/readers", response_class=HTMLResponse)
async def readers_page(request: Request, search: str = "", db = Depends(get_db)):
    try:
        search_param = f"{search.strip()}%"

        query = db.query(
            Reader.reader_id,
            Reader.fio,
            Reader.dolzhnost,
            Reader.uchenaya_stepen,
            func.count(BookLoan.loan_id).label('active_loans_count')
        ).outerjoin(BookLoan, and_(
            BookLoan.reader_id == Reader.reader_id,
            BookLoan.loan_return_date == None
        )).filter(Reader.fio.ilike(search_param))\
         .group_by(
             Reader.reader_id,
             Reader.fio,
             Reader.dolzhnost,
             Reader.uchenaya_stepen
         )

        readers_data = query.all()
        
        readers = []
        for row in readers_data:
            readers.append({
                "id": row.reader_id,
                "fio": row.fio,
                "dolzhnost": row.dolzhnost or "Не указано",
                "uchenaya_stepen": row.uchenaya_stepen or "Не указано",
                "active_loans": row.active_loans_count
            })
        
        return templates.TemplateResponse(
            request=request, name="readers.html", context={"readers": readers, "search": search}
        )
        
    except Exception as e:
        print(e)
        return "<h1>Server Error: Could not load readers data.</h1>"
