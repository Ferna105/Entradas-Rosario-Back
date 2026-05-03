BEGIN;

CREATE TABLE IF NOT EXISTS favorites (
  id         SERIAL    PRIMARY KEY,
  user_id    INTEGER   NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  event_id   INTEGER   NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_favorites_user_event UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id  ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_event_id ON favorites(event_id);

COMMIT;
