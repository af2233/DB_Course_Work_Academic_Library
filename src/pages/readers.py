import streamlit as st

from repositories.readers import reader_repository


st.set_page_config(page_title="Читатели", layout="wide")
st.title("Читатели")


def show_readers():
    """Показать список читателей"""
    readers_df = reader_repository.get_all_readers()
    
    if not readers_df.empty:
        # Статистика
        total_readers = len(readers_df)
        active_loans = readers_df['active_loans'].sum()
        
        col1, col2 = st.columns(2)
        with col1:
            st.metric("Всего читателей", total_readers)
        with col2:
            st.metric("Активных займов", active_loans)
        
        st.divider()
        
        # Список читателей
        for _, reader in readers_df.iterrows():
            with st.container():
                col1, col2 = st.columns([3, 1])
                
                with col1:
                    st.subheader(reader['fio'])
                    
                    if reader['dolzhnost']:
                        st.write(f"**Должность:** {reader['dolzhnost']}")
                    
                    if reader['uchenaya_stepen']:
                        st.write(f"**Ученая степень:** {reader['uchenaya_stepen']}")
                
                with col2:
                    if reader['active_loans'] > 0:
                        st.write(f"**Активных займов:** {reader['active_loans']}")
                    else:
                        st.write("**Активных займов:** нет")
                
                st.divider()
    else:
        st.info("В библиотеке пока нет зарегистрированных читателей")

show_readers()
