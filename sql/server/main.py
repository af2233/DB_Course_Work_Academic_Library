from logging import exception

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
from fastapi.responses import HTMLResponse
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.templating import Jinja2Templates

import asyncpg

app = FastAPI()
app.add_middleware(GZipMiddleware, minimum_size=500)
app.mount("/static", StaticFiles(directory="static"), name="static")


templates = Jinja2Templates(directory="templates")


@app.get("/", response_class = HTMLResponse)
# @app.get("/")
async def read_root(request: Request, search: str=""):

    try:
        conn = await asyncpg.connect(user='postgres', password='123',
                                     database='postgres', host='localhost')

        sql_query = """
        SELECT 
            book_name,
            theme_name,
            publisher_name,
            release_date,
            isbn,
            count(*) as available_book_count
        FROM books as b
        JOIN publishers as p
        on b.publisher_id = p.publisher_id
        join themes as t
        on b.theme_id = t.theme_id
        JOIN book_items AS bi
        ON b.book_id = bi.book_id
        where book_name ilike $1
        and bi.book_state = 'Доступна'
        group by b.book_name, t.theme_name, p.publisher_name, b.release_date, b.isbn;
        """

        search_param = search.strip() + "%"

        values = await conn.fetch(sql_query, search_param)
        await conn.close()

        books = []

        for i in values:
            books.append({"name": i["book_name"],
                          "theme": i["theme_name"],
                          "publisher": i["publisher_name"],
                          "release_date": i["release_date"],
                          "isbn": i["isbn"],
                          "available_book_count": i["available_book_count"]})

        return templates.TemplateResponse(
            request=request, name="books.html", context={"books": books}
        )

    except Exception as e:
        print(e)

        return "<h1>Server Error: Could not load data.</h1>"










