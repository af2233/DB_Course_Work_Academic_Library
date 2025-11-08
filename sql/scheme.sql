begin; 


drop domain if exists book_states cascade;

DROP TABLE IF EXISTS publishers CASCADE;
DROP TABLE IF EXISTS themes CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF exists book_items cascade;
DROP TABLE IF EXISTS authors CASCADE;
DROP TABLE IF EXISTS author_book CASCADE;
DROP TABLE IF EXISTS readers CASCADE;
DROP TABLE IF EXISTS book_loans CASCADE;


create domain book_states as text
default 'Доступна'
check (value in ('Доступна', 'Списана', 'Утеряна', 'Займ'));


CREATE TABLE publishers (
	publisher_id serial PRIMARY KEY,
	publisher_name text NOT null unique
);

CREATE TABLE themes (
	theme_id serial PRIMARY KEY, 
	theme_name text unique
);


CREATE TABLE books (
	book_id serial PRIMARY KEY,
	book_name text NOT NULL,
	publisher_id int REFERENCES publishers(publisher_id),	
	isbn text,
	release_date smallint,
	theme_id int REFERENCES themes(theme_id)
);

create table book_items (
	book_item_id serial primary key,
	book_id int references books(book_id),
	book_state book_states,
	acquisition_date date,
	write_of_reasons text
);


CREATE TABLE authors (
	author_id serial PRIMARY KEY,
	author_name text unique
);



CREATE TABLE author_book (
	author_id int REFERENCES authors(author_id),
	book_id int REFERENCES books(book_id),
	PRIMARY KEY (author_id, book_id)
);


CREATE TABLE readers (
	reader_id serial PRIMARY KEY,
	FIO text NOT null unique,
	Dolzhnost text,
	Uchenaya_Stepen text
);

CREATE TABLE book_loans (
	loan_id serial PRIMARY KEY,
	loan_date date NOT NULL,
	loan_due_date date,
	loan_return_date date default null,

	book_item_id int REFERENCES book_items(book_item_id),
	reader_id int REFERENCES readers(reader_id)
);


-- Регистрация книг (ОК)
create or replace function register_book(
	p_BOOK_NAME text,
	p_AUTHORS_LIST text,
	p_PUBLISHER_NAME text,
	p_ISBN text,
	p_RELEASE_YEAR smallint,
	p_THEME text,
	p_NUMBER_OF_BOOKS smallint,
	p_ACQUISITION_DATE date
) returns void as $$
DECLARE 

	v_publisher_id int;
	v_theme_id int;
	v_book_id int;
	
	v_book_found int;
BEGIN


	perform add_authors(p_AUTHORS_LIST);
	perform add_publisher(p_PUBLISHER_NAME);
	perform add_theme(p_THEME);
	
	
	
	SELECT publisher_id INTO v_publisher_id FROM publishers WHERE publishers.publisher_name = p_PUBLISHER_NAME;
	SELECT theme_id INTO v_theme_id FROM themes WHERE themes.theme_name = p_THEME;

	SELECT book_id INTO v_book_id 
	FROM books WHERE isbn is not distinct from p_ISBN and book_name = p_BOOK_NAME;

	if not found then
		INSERT INTO books (book_name, publisher_id, isbn, release_date, theme_id) 
		SELECT p_BOOK_NAME, v_publisher_id, p_ISBN, p_RELEASE_YEAR, v_theme_id
		WHERE NOT EXISTS(SELECT 1 FROM books WHERE isbn = p_ISBN)
		returning book_id into v_book_id;
	end if;
		


	INSERT into book_items(book_id, acquisition_date)
	select v_book_id, p_ACQUISITION_DATE
	FROM generate_series(1, p_NUMBER_OF_BOOKS);
	

	INSERT INTO author_book(book_id, author_id)
	select DISTINCT
	    v_book_id,
	    a.author_id
	from unnest(string_to_array(p_AUTHORS_LIST, ',')) AS parsed_author_name
	join
		authors as a on a.author_name = trim(parsed_author_name)
	WHERE
	    p_AUTHORS_LIST IS NOT NULL
		AND TRIM(parsed_author_name) <> ''
	ON CONFLICT (author_id, book_id) DO NOTHING;
	

END;
$$ language plpgsql;



-- Выдача/получение книг с проверкой возможности (ОК)
create or replace function loan_book(
	p_READER_FIO text,
	p_BOOK_TO_LOAN text,
	p_LOAN_DATE date,
	p_LOAN_DUE_DATE date
) returns void as $$
DECLARE 
	v_book_id int;
	v_book_item_id int;
	v_reader_id int;	
BEGIN

	SELECT reader_id INTO v_reader_id FROM readers WHERE FIO = p_READER_FIO;
	IF NOT FOUND THEN 
		raise EXCEPTION 'Читатель "%" не найден!', p_READER_FIO;
	END IF;
	
	
	SELECT book_id INTO v_book_id FROM books WHERE book_name = p_BOOK_TO_LOAN;
	IF NOT FOUND THEN
		raise EXCEPTION 'Книги "%" в библиотеке нет!', p_BOOK_TO_LOAN;
	END IF;
	
	
	SELECT book_item_id INTO v_book_item_id 
	FROM book_items 
	JOIN books
	ON book_items.book_id = books.book_id
	WHERE book_items.book_state = 'Доступна'
	AND books.book_name = p_BOOK_TO_LOAN
	LIMIT 1
	FOR UPDATE;
	
	
	IF NOT FOUND THEN
		raise EXCEPTION 'Все экземлпяры книги "%" разданы!', p_BOOK_TO_LOAN;
	ELSE 
		INSERT INTO book_loans (loan_date, loan_due_date, book_item_id, reader_id)
		SELECT p_LOAN_DATE, p_LOAN_DUE_DATE, v_book_item_id, v_reader_id;
	
	
		UPDATE book_items SET book_state = 'Займ'
		WHERE book_item_id = v_book_item_id;

		
	END IF;
	
	
END;
$$ language plpgsql;



-- Возврат книг (ОК)
CREATE OR replace FUNCTION return_book(
	p_READER_FIO text,
	p_book_item_id int
) returns void AS $$
DECLARE 
	v_book_name text;
BEGIN 
	
	
	SELECT * FROM book_items AS bi
	JOIN book_loans AS bl ON bi.book_item_id = bl.book_item_id
	JOIN readers AS r ON bl.reader_id = r.reader_id
	WHERE r.FIO = p_READER_FIO
	AND bi.book_item_id = p_book_item_id
	AND bi.book_state = 'Займ';
	
	
	IF FOUND
	THEN 
		UPDATE book_items SET book_state = 'Доступна'
		WHERE book_item_id = p_book_item_id;
	
		UPDATE book_loans SET loan_return_date = current_date 
		WHERE book_item_id = p_book_item_id AND loan_return_date is null;

		
	ELSE 
		SELECT * FROM book_items AS bi
		JOIN book_loans AS bl ON bi.book_item_id = bl.book_item_id
		JOIN readers AS r ON bl.reader_id = r.reader_id
		WHERE r.FIO = p_READER_FIO
		AND bi.book_item_id = p_book_item_id
		AND bi.book_state = 'Списана' OR bi.book_state = 'Утеряна';
	
	
		SELECT book_name INTO v_book_name 
		FROM books AS b
		JOIN book_items AS bi
		ON b.book_id = bi.book_id
		WHERE bi.book_item_id = p_book_item_id;
	
		IF FOUND 
		then 
			raise EXCEPTION 'Книга "%" уже была возвращена или она была утеряна/списана библиотекой!', v_book_name;
		END IF;
	
		
	END IF;

END;
$$ language plpgsql;


CREATE OR replace FUNCTION add_authors (
	p_AUTHORS_LIST text
) RETURNS void AS $$
BEGIN
	
	INSERT INTO authors(author_name)
	SELECT
	    trim(name)
	FROM 
		unnest(string_to_array(p_AUTHORS_LIST, ',')) AS author_name(name)
	WHERE
	    TRIM(name) <> ''
	ON conflict (author_name) do nothing;
END;
$$ LANGUAGE plpgsql;


CREATE OR replace FUNCTION add_publisher (
	p_PUBLISHERS_LIST text
) RETURNS void AS $$
BEGIN
	
	INSERT INTO publishers(publisher_name)
	SELECT
	    trim(name)
	FROM 
		unnest(string_to_array(p_PUBLISHERS_LIST, ',')) AS publisher_name(name)
	WHERE
	    TRIM(name) <> ''
	ON conflict (publisher_name) do nothing;
END;
$$ LANGUAGE plpgsql;


CREATE OR replace FUNCTION add_theme (
	p_THEMES_LIST text
) RETURNS void AS $$
BEGIN
	
	INSERT INTO themes(theme_name)
	SELECT
	    trim(name)
	FROM 
		unnest(string_to_array(p_THEMES_LIST, ',')) AS theme_name(name)
	WHERE
	    TRIM(name) <> ''
	ON conflict (theme_name) do nothing;
END;
$$ LANGUAGE plpgsql;


CREATE OR replace FUNCTION register_reader (
	p_FIO text,
	p_Dolzhnost text,
	p_Uchenaya_Stepen text
) RETURNS void AS $$
BEGIN
	
	INSERT INTO readers(FIO, Dolzhnost, Uchenaya_Stepen)
	values
	    (trim(p_FIO), trim(p_Dolzhnost), trim(p_Uchenaya_Stepen))
	ON conflict (FIO) do nothing;
END;
$$ LANGUAGE plpgsql;





commit;