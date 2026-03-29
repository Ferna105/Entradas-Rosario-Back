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
    mp_refresh_token text,
    mp_user_id text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    type public."User type" DEFAULT 'buyer'::public."User type" NOT NULL,
    CONSTRAINT users_type_check CHECK (((type)::text = ANY (ARRAY[('buyer'::character varying)::text, ('seller'::character varying)::text, ('admin'::character varying)::text, ('scanner'::character varying)::text])))
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
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    image character varying,
    status character varying(20) NOT NULL DEFAULT 'published',
    marketplace_fee_percent numeric(5,2) NOT NULL DEFAULT 10.00
);

CREATE SEQUENCE public.events_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;
ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);

CREATE TABLE public.event_ticket_types (
    id integer NOT NULL,
    event_id integer NOT NULL,
    name character varying(120) NOT NULL,
    price numeric(10,2) NOT NULL,
    capacity integer NOT NULL,
    sort_order integer NOT NULL DEFAULT 0
);

CREATE SEQUENCE public.event_ticket_types_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.event_ticket_types_id_seq OWNED BY public.event_ticket_types.id;
ALTER TABLE ONLY public.event_ticket_types ALTER COLUMN id SET DEFAULT nextval('public.event_ticket_types_id_seq'::regclass);

CREATE TABLE public.purchases (
    id integer NOT NULL,
    event_id integer,
    ticket_type_id integer NOT NULL,
    buyer_id integer,
    buyer_name character varying(100),
    buyer_email character varying(100),
    quantity integer NOT NULL,
    total_amount numeric(10,2),
    payment_status character varying(20) NOT NULL DEFAULT 'pending',
    mp_payment_id text,
    mp_preference_id text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE public.purchases_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.purchases_id_seq OWNED BY public.purchases.id;
ALTER TABLE ONLY public.purchases ALTER COLUMN id SET DEFAULT nextval('public.purchases_id_seq'::regclass);

CREATE TABLE public.tickets (
    id integer NOT NULL,
    purchase_id integer,
    event_id integer,
    ticket_type_id integer NOT NULL,
    qr_data text NOT NULL,
    qr_code text,
    status character varying(20) NOT NULL DEFAULT 'valid',
    scanned_at timestamp without time zone,
    scanned_by integer,
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

COPY public.events (id, seller_id, name, description, location, event_date, created_at, image, status, marketplace_fee_percent) FROM stdin;
8	3	Metallica World Tour	Metallica llega a Rosario con su gira mundial	Estadio Gigante de Arroyito	2025-07-20 21:00:00	2025-05-18 19:13:05.618628	https://placehold.co/1200x400/000000/FFFFFF/png?text=Metallica+World+Tour	published	10.00
9	3	Taylor Swift - The Eras Tour	Taylor Swift presenta The Eras Tour	Estadio Gigante de Arroyito	2025-07-25 19:30:00	2025-05-18 19:13:05.618628	https://placehold.co/1200x400/FF69B4/FFFFFF/png?text=Taylor+Swift+-+The+Eras+Tour	published	10.00
10	3	Los Redondos - Tributo	Tributo a Los Redondos	Teatro Broadway	2025-07-30 22:00:00	2025-05-18 19:13:05.618628	https://placehold.co/600x400/FF0000/FFFFFF/png?text=Los+Redondos+-+Tributo	published	10.00
11	3	La Renga	La Renga en vivo	Estadio Gigante de Arroyito	2025-08-05 21:00:00	2025-05-18 19:13:05.618628	https://placehold.co/600x400/0000FF/FFFFFF/png?text=La+Renga	published	10.00
12	3	Divididos	Divididos en concierto	Teatro Broadway	2025-08-10 20:30:00	2025-05-18 19:13:05.618628	https://placehold.co/600x400/FFA500/FFFFFF/png?text=Divididos	published	10.00
7	3	Coldplay en Rosario	Concierto de Coldplay en Rosario	Estadio Gigante de Arroyito	2025-07-15 20:00:00	2025-05-18 19:13:05.618628	https://placehold.co/1200x400/1DB954/FFFFFF/png?text=Coldplay+en+Rosario	published	10.00
15	3	Fiaca en García	Fiaca en García por primera vez	García, Rosario	2025-05-31 17:56:59	2025-05-18 17:57:33	\N	published	10.00
\.

COPY public.event_ticket_types (id, event_id, name, price, capacity, sort_order) FROM stdin;
1	8	General	30000.00	40000	0
2	9	General	35000.00	40000	0
3	10	General	12000.00	2000	0
4	11	General	18000.00	40000	0
5	12	General	15000.00	2000	0
6	7	General	25000.00	40000	0
7	15	General	100.00	100	0
\.

COPY public.purchases (id, event_id, ticket_type_id, buyer_name, buyer_email, quantity, payment_status, created_at) FROM stdin;
\.

COPY public.tickets (id, purchase_id, created_at) FROM stdin;
\.

CREATE TABLE public.event_scanners (
    id integer NOT NULL,
    event_id integer NOT NULL,
    scanner_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE public.event_scanners_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.event_scanners_id_seq OWNED BY public.event_scanners.id;
ALTER TABLE ONLY public.event_scanners ALTER COLUMN id SET DEFAULT nextval('public.event_scanners_id_seq'::regclass);

-- Sequences
SELECT pg_catalog.setval('public.events_id_seq', 15, true);
SELECT pg_catalog.setval('public.event_ticket_types_id_seq', 7, true);
SELECT pg_catalog.setval('public.purchases_id_seq', 1, false);
SELECT pg_catalog.setval('public.tickets_id_seq', 1, false);
SELECT pg_catalog.setval('public.users_id_seq', 3, true);

-- Primary keys
ALTER TABLE ONLY public.events ADD CONSTRAINT events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.event_ticket_types ADD CONSTRAINT event_ticket_types_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.purchases ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tickets ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_email_key UNIQUE (email);

-- Foreign keys
ALTER TABLE ONLY public.events ADD CONSTRAINT events_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.event_ticket_types ADD CONSTRAINT event_ticket_types_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.purchases ADD CONSTRAINT purchases_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);
ALTER TABLE ONLY public.purchases ADD CONSTRAINT purchases_ticket_type_id_fkey FOREIGN KEY (ticket_type_id) REFERENCES public.event_ticket_types(id);
ALTER TABLE ONLY public.purchases ADD CONSTRAINT purchases_payment_status_check
  CHECK (payment_status::text = ANY (ARRAY['pending', 'approved', 'rejected', 'refunded', 'paid', 'failed']::text[]));

ALTER TABLE ONLY public.tickets ADD CONSTRAINT tickets_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchases(id);
ALTER TABLE ONLY public.tickets ADD CONSTRAINT tickets_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);
ALTER TABLE ONLY public.tickets ADD CONSTRAINT tickets_ticket_type_id_fkey FOREIGN KEY (ticket_type_id) REFERENCES public.event_ticket_types(id);
ALTER TABLE ONLY public.tickets ADD CONSTRAINT tickets_scanned_by_fkey FOREIGN KEY (scanned_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.event_scanners ADD CONSTRAINT event_scanners_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.event_scanners ADD CONSTRAINT event_scanners_event_scanner_unique UNIQUE (event_id, scanner_id);
ALTER TABLE ONLY public.event_scanners ADD CONSTRAINT event_scanners_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.event_scanners ADD CONSTRAINT event_scanners_scanner_id_fkey FOREIGN KEY (scanner_id) REFERENCES public.users(id) ON DELETE CASCADE;
