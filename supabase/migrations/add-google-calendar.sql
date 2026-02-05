-- Migration: Add Google Calendar integration support
-- This migration adds the google_event_id column to bookings table
-- to track the corresponding Google Calendar event for each booking

-- Add google_event_id column to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255);

-- Add index for faster lookups when syncing from Google Calendar
CREATE INDEX IF NOT EXISTS idx_bookings_google_event_id ON bookings(google_event_id);

-- Add comment for documentation
COMMENT ON COLUMN bookings.google_event_id IS 'The corresponding Google Calendar event ID for two-way sync';
