CREATE TYPE public."User type" AS ENUM (
    'buyer',
    'seller',
    'admin',
    'scanner'
);

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash text NOT NULL,
    mp_access_token text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    type public."User type" DEFAULT 'buyer'::public."User type" NOT NULL,
    CONSTRAINT users_type_check CHECK (((type)::text = ANY (ARRAY[('buyer'::character varying)::text, ('seller'::character varying)::text, ('admin'::character varying)::text])))
);

CREATE SEQUENCE public.users_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

CREATE TABLE public.events (
    id integer NOT NULL,
    seller_id integer,
    name character varying(200) NOT NULL,
    description text,
    location character varying(255),
    event_date timestamp without time zone NOT NULL,
    price numeric(10,2) NOT NULL,
    capacity integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    image character varying
);

CREATE SEQUENCE public.events_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;
ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);

CREATE TABLE public.purchases (
    id integer NOT NULL,
    event_id integer,
    buyer_name character varying(100),
    buyer_email character varying(100),
    quantity integer NOT NULL,
    payment_status character varying(10) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT purchases_payment_status_check CHECK (((payment_status)::text = ANY (ARRAY[('pending'::character varying)::text, ('paid'::character varying)::text, ('failed'::character varying)::text])))
);

CREATE SEQUENCE public.purchases_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.purchases_id_seq OWNED BY public.purchases.id;
ALTER TABLE ONLY public.purchases ALTER COLUMN id SET DEFAULT nextval('public.purchases_id_seq'::regclass);

CREATE TABLE public.tickets (
    id integer NOT NULL,
    purchase_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE public.tickets_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.tickets_id_seq OWNED BY public.tickets.id;
ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq'::regclass);

-- Data
COPY public.users (id, name, email, password_hash, mp_access_token, created_at, type) FROM stdin;
3	Fernando Mariscotti	fernamariscotti@gmail.com	342432	\N	2025-05-18 19:10:41.471509	seller
\.

COPY public.events (id, seller_id, name, description, location, event_date, price, capacity, created_at, image) FROM stdin;
8	3	Metallica World Tour	Metallica llega a Rosario con su gira mundial	Estadio Gigante de Arroyito	2025-07-20 21:00:00	30000.00	40000	2025-05-18 19:13:05.618628	https://placehold.co/1200x400/000000/FFFFFF/png?text=Metallica+World+Tour
9	3	Taylor Swift - The Eras Tour	Taylor Swift presenta The Eras Tour	Estadio Gigante de Arroyito	2025-07-25 19:30:00	35000.00	40000	2025-05-18 19:13:05.618628	https://placehold.co/1200x400/FF69B4/FFFFFF/png?text=Taylor+Swift+-+The+Eras+Tour
10	3	Los Redondos - Tributo	Tributo a Los Redondos	Teatro Broadway	2025-07-30 22:00:00	12000.00	2000	2025-05-18 19:13:05.618628	https://placehold.co/600x400/FF0000/FFFFFF/png?text=Los+Redondos+-+Tributo
11	3	La Renga	La Renga en vivo	Estadio Gigante de Arroyito	2025-08-05 21:00:00	18000.00	40000	2025-05-18 19:13:05.618628	https://placehold.co/600x400/0000FF/FFFFFF/png?text=La+Renga
12	3	Divididos	Divididos en concierto	Teatro Broadway	2025-08-10 20:30:00	15000.00	2000	2025-05-18 19:13:05.618628	https://placehold.co/600x400/FFA500/FFFFFF/png?text=Divididos
7	3	Coldplay en Rosario	Concierto de Coldplay en Rosario	Estadio Gigante de Arroyito	2025-07-15 20:00:00	25000.00	40000	2025-05-18 19:13:05.618628	https://placehold.co/1200x400/1DB954/FFFFFF/png?text=Coldplay+en+Rosario
15	3	Fiaca en García	Fiaca en García por primera vez	García, Rosario	2025-05-31 17:56:59	100.00	100	2025-05-18 17:57:33	\N
\.

COPY public.purchases (id, event_id, buyer_name, buyer_email, quantity, payment_status, created_at) FROM stdin;
\.

COPY public.tickets (id, purchase_id, created_at) FROM stdin;
\.

-- Sequences
SELECT pg_catalog.setval('public.events_id_seq', 15, true);
SELECT pg_catalog.setval('public.purchases_id_seq', 1, false);
SELECT pg_catalog.setval('public.tickets_id_seq', 1, false);
SELECT pg_catalog.setval('public.users_id_seq', 3, true);

-- Primary keys
ALTER TABLE ONLY public.events ADD CONSTRAINT events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.purchases ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tickets ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_email_key UNIQUE (email);

-- Foreign keys
ALTER TABLE ONLY public.events ADD CONSTRAINT events_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.purchases ADD CONSTRAINT purchases_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);
ALTER TABLE ONLY public.tickets ADD CONSTRAINT tickets_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchases(id);
