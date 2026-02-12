-- System Improvements Migration
-- Notification preferences, reminder tracking, debitable hours, overbooking, notification log

-- Notification preferences per installer
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "discord": true}';

-- Reminder tracking for offers
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;

-- Debitable hours per installer assignment
ALTER TABLE booking_installers ADD COLUMN IF NOT EXISTS actual_hours NUMERIC;
ALTER TABLE booking_installers ADD COLUMN IF NOT EXISTS debitable_hours NUMERIC;

-- Over-booking flag
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS overbooking_resolved BOOLEAN DEFAULT false;

-- Notification log for diagnostics
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

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_channel ON notification_log (channel);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log (status);
