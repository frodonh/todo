--
-- PostgreSQL database dump
--

-- Dumped from database version 12.9 (Ubuntu 12.9-0ubuntu0.20.04.1)
-- Dumped by pg_dump version 12.9 (Ubuntu 12.9-0ubuntu0.20.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY todo.todo DROP CONSTRAINT IF EXISTS todo_cat_fkey;
DROP TRIGGER IF EXISTS set_current_date ON todo.todo;
DROP INDEX IF EXISTS todo.todo_due_idx;
DROP INDEX IF EXISTS todo.categories_name_ix;
ALTER TABLE IF EXISTS ONLY todo.todo DROP CONSTRAINT IF EXISTS todo_pkey;
ALTER TABLE IF EXISTS ONLY todo.categories DROP CONSTRAINT IF EXISTS categories_pkey;
ALTER TABLE IF EXISTS todo.todo ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS todo.categories ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS todo.todo_id_seq;
DROP TABLE IF EXISTS todo.todo;
DROP SEQUENCE IF EXISTS todo.categories_id_seq;
DROP TABLE IF EXISTS todo.categories;
DROP FUNCTION IF EXISTS todo.trigger_set_current_date();
DROP SCHEMA IF EXISTS todo;
--
-- Name: todo; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA todo;


--
-- Name: trigger_set_current_date(); Type: FUNCTION; Schema: todo; Owner: -
--

CREATE FUNCTION todo.trigger_set_current_date() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  NEW.updated=current_date;
  return NEW;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: todo; Owner: -
--

CREATE TABLE todo.categories (
    id integer NOT NULL,
    name character varying(20)
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: todo; Owner: -
--

CREATE SEQUENCE todo.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: todo; Owner: -
--

ALTER SEQUENCE todo.categories_id_seq OWNED BY todo.categories.id;


--
-- Name: todo; Type: TABLE; Schema: todo; Owner: -
--

CREATE TABLE todo.todo (
    id integer NOT NULL,
    task text,
    resp text,
    due date,
    status integer,
    comment text,
    cat integer,
    other text,
    source text,
    updated date DEFAULT CURRENT_DATE
);


--
-- Name: todo_id_seq; Type: SEQUENCE; Schema: todo; Owner: -
--

CREATE SEQUENCE todo.todo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: todo_id_seq; Type: SEQUENCE OWNED BY; Schema: todo; Owner: -
--

ALTER SEQUENCE todo.todo_id_seq OWNED BY todo.todo.id;


--
-- Name: categories id; Type: DEFAULT; Schema: todo; Owner: -
--

ALTER TABLE ONLY todo.categories ALTER COLUMN id SET DEFAULT nextval('todo.categories_id_seq'::regclass);


--
-- Name: todo id; Type: DEFAULT; Schema: todo; Owner: -
--

ALTER TABLE ONLY todo.todo ALTER COLUMN id SET DEFAULT nextval('todo.todo_id_seq'::regclass);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: todo; Owner: -
--

ALTER TABLE ONLY todo.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: todo todo_pkey; Type: CONSTRAINT; Schema: todo; Owner: -
--

ALTER TABLE ONLY todo.todo
    ADD CONSTRAINT todo_pkey PRIMARY KEY (id);


--
-- Name: categories_name_ix; Type: INDEX; Schema: todo; Owner: -
--

CREATE UNIQUE INDEX categories_name_ix ON todo.categories USING btree (lower((name)::text));


--
-- Name: todo_due_idx; Type: INDEX; Schema: todo; Owner: -
--

CREATE INDEX todo_due_idx ON todo.todo USING btree (due);


--
-- Name: todo set_current_date; Type: TRIGGER; Schema: todo; Owner: -
--

CREATE TRIGGER set_current_date BEFORE UPDATE ON todo.todo FOR EACH ROW EXECUTE FUNCTION todo.trigger_set_current_date();


--
-- Name: todo todo_cat_fkey; Type: FK CONSTRAINT; Schema: todo; Owner: -
--

ALTER TABLE ONLY todo.todo
    ADD CONSTRAINT todo_cat_fkey FOREIGN KEY (cat) REFERENCES todo.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

