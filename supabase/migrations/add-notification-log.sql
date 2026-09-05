-- Notification log used by /admin/diagnostics and lib/email.ts / lib/discord-bot.ts.
-- Safe to run multiple times.
CREATE TABLE IF NOT EXISTS notification_log (
  id SERIAL PRIMARY KEY,
  channel TEXT NOT NULL,
  event_type TEXT NOT NULL,
  recipient TEXT,
  reference_type TEXT,
  reference_id INTEGER,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_channel ON notification_log (channel);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log (status);
-- App uses the service role everywhere; lock the table down for anon/authenticated.
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
