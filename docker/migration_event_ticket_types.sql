-- Ejecutar contra la base existente (synchronize: false).
-- Tipos de entrada por evento: capacidad y precio por tipo; elimina price/capacity de events.

BEGIN;

CREATE TABLE IF NOT EXISTS event_ticket_types (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity >= 1),
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_event_ticket_types_event_id ON event_ticket_types(event_id);

INSERT INTO event_ticket_types (event_id, name, price, capacity, sort_order)
SELECT id, 'General', price, capacity, 0
FROM events
WHERE NOT EXISTS (
  SELECT 1 FROM event_ticket_types t WHERE t.event_id = events.id
);

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS ticket_type_id INTEGER REFERENCES event_ticket_types(id);

UPDATE purchases p
SET ticket_type_id = sub.id
FROM (
  SELECT DISTINCT ON (event_id) id, event_id
  FROM event_ticket_types
  ORDER BY event_id, id
) sub
WHERE p.event_id = sub.event_id AND p.ticket_type_id IS NULL;

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_type_id INTEGER REFERENCES event_ticket_types(id);

UPDATE tickets tk
SET ticket_type_id = p.ticket_type_id
FROM purchases p
WHERE tk.purchase_id = p.id AND tk.ticket_type_id IS NULL;

UPDATE tickets tk
SET ticket_type_id = sub.id
FROM (
  SELECT DISTINCT ON (event_id) id, event_id
  FROM event_ticket_types
  ORDER BY event_id, id
) sub
WHERE tk.event_id = sub.event_id AND tk.ticket_type_id IS NULL;

ALTER TABLE purchases ALTER COLUMN ticket_type_id SET NOT NULL;
ALTER TABLE tickets ALTER COLUMN ticket_type_id SET NOT NULL;

ALTER TABLE events DROP COLUMN IF EXISTS price;
ALTER TABLE events DROP COLUMN IF EXISTS capacity;

COMMIT;
