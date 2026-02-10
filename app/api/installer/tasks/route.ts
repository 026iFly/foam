import { NextResponse } from 'next/server';
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
