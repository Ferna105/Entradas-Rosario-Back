-- Ejecutar contra la base existente (synchronize: false).
-- Agrega categoría a eventos: música / trap / rock / electrónica / festival / otros.

BEGIN;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'otros';

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_category_check;

ALTER TABLE events
  ADD CONSTRAINT events_category_check
  CHECK (category IN ('musica', 'trap', 'rock', 'electronica', 'festival', 'otros'));

CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);

COMMIT;
