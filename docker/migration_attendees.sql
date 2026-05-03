-- Ejecutar contra la base existente (synchronize: false).
-- Habilita la sección opcional "Quiénes van":
--   * events.show_attendees: el organizador habilita la sección por evento.
--   * purchases.show_in_attendees: el comprador opta por aparecer en la lista.

BEGIN;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS show_attendees BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE purchases
  ADD COLUMN IF NOT EXISTS show_in_attendees BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_purchases_attendees
  ON purchases(event_id)
  WHERE show_in_attendees = TRUE AND payment_status = 'approved';

COMMIT;
