-- Migration: Add tasks table and user assignments
-- This enables proper task tracking and multi-user support

-- Add assigned_to column to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_bookings_assigned_to ON bookings(assigned_to);

-- Create tasks table for trackable to-do items
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,

  -- Task content
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'

  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),

  -- Related entities (optional - link task to quote/booking)
  quote_id INTEGER REFERENCES quote_requests(id) ON DELETE SET NULL,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,

  -- Task type for auto-generated tasks
  task_type VARCHAR(50), -- 'review_quote', 'send_offer', 'follow_up', 'book_installation', 'send_rot_link', 'custom'

  -- Dates
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_quote_id ON tasks(quote_id);
CREATE INDEX IF NOT EXISTS idx_tasks_booking_id ON tasks(booking_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);

-- Comments for documentation
COMMENT ON TABLE tasks IS 'Trackable tasks for quotes, bookings, and general to-dos';
COMMENT ON COLUMN tasks.task_type IS 'Type of auto-generated task, or custom for manual tasks';
COMMENT ON COLUMN bookings.assigned_to IS 'User assigned to handle this booking';
