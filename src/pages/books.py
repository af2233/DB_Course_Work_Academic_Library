import streamlit as st

from repositories.books import book_repository


st.set_page_config(page_title="Книги", layout="wide")
st.title("Книги")


def show_books():
    """Показать список книг"""
    books_df = book_repository.get_all_books()
    
    if not books_df.empty:
        # Статистика
        total_books = len(books_df)
        total_copies = books_df['total_copies'].sum()
        available_copies = books_df['available_copies'].sum()
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Всего книг в каталоге", total_books)
        with col2:
            st.metric("Всего экземпляров", total_copies)
        with col3:
            st.metric("Доступно экземпляров", available_copies)
        
        st.divider()
        
        # Список книг
        for _, book in books_df.iterrows():
            with st.container():
                col1, col2 = st.columns([3, 1])
                
                with col1:
                    st.subheader(book['book_name'])
                    st.write(f"**Авторы:** {book['authors']}")
                    st.write(f"**Издательство:** {book['publisher']}")
                    
                    if book['release_date']:
                        st.write(f"**Год издания:** {book['release_date']}")
                    
                    if book['theme']:
                        st.write(f"**Тематика:** {book['theme']}")
                    
                    if book['isbn']:
                        st.write(f"**ISBN:** {book['isbn']}")
                
                with col2:
                    st.write(f"**Экземпляры:** {book['available_copies']}/{book['total_copies']}")
                
                st.divider()
    else:
        st.info("В библиотеке пока нет книг")

show_books()
