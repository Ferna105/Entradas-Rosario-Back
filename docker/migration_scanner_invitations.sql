-- Ejecutar contra la base existente (synchronize: false).
CREATE TABLE public.scanner_invitations (
    id integer NOT NULL,
    event_id integer NOT NULL,
    email character varying(255) NOT NULL,
    token_hash character varying(64) NOT NULL,
    status character varying(20) NOT NULL DEFAULT 'pending',
    expires_at timestamp without time zone NOT NULL,
    invited_by_user_id integer NOT NULL,
    accepted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE SEQUENCE public.scanner_invitations_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.scanner_invitations_id_seq OWNED BY public.scanner_invitations.id;
ALTER TABLE ONLY public.scanner_invitations ALTER COLUMN id SET DEFAULT nextval('public.scanner_invitations_id_seq'::regclass);

ALTER TABLE ONLY public.scanner_invitations ADD CONSTRAINT scanner_invitations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.scanner_invitations ADD CONSTRAINT scanner_invitations_event_email_unique UNIQUE (event_id, email);
ALTER TABLE ONLY public.scanner_invitations ADD CONSTRAINT scanner_invitations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.scanner_invitations ADD CONSTRAINT scanner_invitations_invited_by_fkey FOREIGN KEY (invited_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;

CREATE INDEX scanner_invitations_token_hash_idx ON public.scanner_invitations (token_hash);
