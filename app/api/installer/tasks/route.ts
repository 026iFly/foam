import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/supabase-auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get installer's pending tasks (confirmation tasks first)
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: tasks, error } = await supabaseAdmin
      .from('tasks')
      .select(`
        *,
        bookings (
          id, scheduled_date, slot_type, status,
          quote_requests (customer_name, customer_address)
        )
      `)
      .eq('assigned_to', user.id)
      .in('status', ['pending', 'in_progress'])
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort: booking_confirmation tasks first, then by priority/date
    const sorted = (tasks || []).sort((a, b) => {
      if (a.task_type === 'booking_confirmation' && b.task_type !== 'booking_confirmation') return -1;
      if (b.task_type === 'booking_confirmation' && a.task_type !== 'booking_confirmation') return 1;
      return 0;
    });

    return NextResponse.json({ tasks: sorted });
  } catch (err) {
    console.error('Installer tasks GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT - Mark a task as completed (for non-confirmation tasks)
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { task_id } = body;

    if (!task_id) {
      return NextResponse.json({ error: 'task_id required' }, { status: 400 });
    }

    // Verify the task belongs to this installer
    const { data: task } = await supabaseAdmin
      .from('tasks')
      .select('id, assigned_to, task_type')
      .eq('id', task_id)
      .eq('assigned_to', user.id)
      .single();

    if (!task) {
      return NextResponse.json({ error: 'Uppgift ej hittad' }, { status: 404 });
    }

    // Mark as completed
    await supabaseAdmin
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', task_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Installer tasks PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
