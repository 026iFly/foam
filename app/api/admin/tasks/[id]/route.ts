import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch a single task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);

    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .select(`
        *,
        quote_requests (
          id,
          customer_name,
          customer_email,
          quote_number,
          status
        ),
        bookings (
          id,
          booking_type,
          scheduled_date,
          scheduled_time
        )
      `)
      .eq('id', taskId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      console.error('Error fetching task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ task });
  } catch (err) {
    console.error('Task GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT - Update a task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);

    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const body = await request.json();
    const { title, description, status, priority, assigned_to, due_date } = body;

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to || null;
    if (due_date !== undefined) updateData.due_date = due_date || null;

    // Handle status changes
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (status === 'pending' || status === 'in_progress') {
        updateData.completed_at = null;
      }
    }

    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ task });
  } catch (err) {
    console.error('Task PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);

    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Error deleting task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Task DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
