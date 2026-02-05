import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Task type definitions for auto-generation
const TASK_TYPES = {
  review_quote: {
    title: 'Granska ny offertförfrågan',
    priority: 'high',
  },
  send_offer: {
    title: 'Skicka offert till kund',
    priority: 'medium',
  },
  follow_up: {
    title: 'Följ upp skickad offert',
    priority: 'low',
  },
  book_visit: {
    title: 'Boka hembesök',
    priority: 'medium',
  },
  book_installation: {
    title: 'Boka installation',
    priority: 'medium',
  },
  send_rot_link: {
    title: 'Skicka länk för ROT-underlag',
    priority: 'high',
  },
};

// GET - List tasks with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assigned_to');
    const quoteId = searchParams.get('quote_id');
    const bookingId = searchParams.get('booking_id');
    const includeCompleted = searchParams.get('include_completed') === 'true';

    let query = supabaseAdmin
      .from('tasks')
      .select(`
        *,
        quote_requests (
          id,
          customer_name,
          quote_number,
          status
        ),
        bookings (
          id,
          booking_type,
          scheduled_date
        )
      `)
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    } else if (!includeCompleted) {
      query = query.in('status', ['pending', 'in_progress']);
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    if (quoteId) {
      query = query.eq('quote_id', parseInt(quoteId));
    }

    if (bookingId) {
      query = query.eq('booking_id', parseInt(bookingId));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tasks: data || [] });
  } catch (err) {
    console.error('Tasks GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Create task or sync/generate tasks from quotes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Special action: sync tasks from quote/booking states
    if (action === 'sync') {
      return syncTasksFromState();
    }

    // Regular task creation
    const {
      title,
      description,
      priority = 'medium',
      assigned_to,
      quote_id,
      booking_id,
      task_type,
      due_date,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        title,
        description,
        priority,
        assigned_to: assigned_to || null,
        quote_id: quote_id || null,
        booking_id: booking_id || null,
        task_type: task_type || 'custom',
        due_date: due_date || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ task });
  } catch (err) {
    console.error('Tasks POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Sync tasks from quote/booking states
async function syncTasksFromState() {
  try {
    const results = {
      created: 0,
      completed: 0,
      errors: [] as string[],
    };

    // Get all quotes that might need tasks
    const { data: quotes, error: quotesError } = await supabaseAdmin
      .from('quote_requests')
      .select('id, customer_name, status, apply_rot_deduction, rot_customer_info, email_sent_at')
      .in('status', ['pending', 'reviewed', 'quoted', 'sent', 'accepted']);

    if (quotesError) {
      return NextResponse.json({ error: quotesError.message }, { status: 500 });
    }

    // Get existing auto-generated tasks (not completed/cancelled)
    const { data: existingTasks } = await supabaseAdmin
      .from('tasks')
      .select('id, quote_id, task_type, status')
      .not('task_type', 'eq', 'custom')
      .in('status', ['pending', 'in_progress']);

    const existingTaskMap = new Map<string, number>();
    existingTasks?.forEach((t) => {
      existingTaskMap.set(`${t.quote_id}-${t.task_type}`, t.id);
    });

    // Get bookings to check what's already booked
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('quote_id, booking_type')
      .neq('status', 'cancelled');

    const bookedQuotes = new Map<number, Set<string>>();
    bookings?.forEach((b) => {
      if (b.quote_id) {
        if (!bookedQuotes.has(b.quote_id)) {
          bookedQuotes.set(b.quote_id, new Set());
        }
        bookedQuotes.get(b.quote_id)!.add(b.booking_type);
      }
    });

    const tasksToCreate: Array<{
      title: string;
      description: string;
      priority: string;
      quote_id: number;
      task_type: string;
      status: string;
    }> = [];
    const tasksToComplete: number[] = [];

    for (const quote of quotes || []) {
      const quoteBookings = bookedQuotes.get(quote.id) || new Set();

      // Check each task type
      // 1. Review new quote (pending status)
      if (quote.status === 'pending') {
        const key = `${quote.id}-review_quote`;
        if (!existingTaskMap.has(key)) {
          tasksToCreate.push({
            title: `${TASK_TYPES.review_quote.title}: ${quote.customer_name}`,
            description: `Granska och prissätt offertförfrågan från ${quote.customer_name}`,
            priority: TASK_TYPES.review_quote.priority,
            quote_id: quote.id,
            task_type: 'review_quote',
            status: 'pending',
          });
        }
      } else {
        // Mark review task as done if quote moved past pending
        const key = `${quote.id}-review_quote`;
        if (existingTaskMap.has(key)) {
          tasksToComplete.push(existingTaskMap.get(key)!);
        }
      }

      // 2. Send offer (reviewed or quoted status)
      if (quote.status === 'reviewed' || quote.status === 'quoted') {
        const key = `${quote.id}-send_offer`;
        if (!existingTaskMap.has(key)) {
          tasksToCreate.push({
            title: `${TASK_TYPES.send_offer.title}: ${quote.customer_name}`,
            description: `Skicka färdig offert till ${quote.customer_name}`,
            priority: TASK_TYPES.send_offer.priority,
            quote_id: quote.id,
            task_type: 'send_offer',
            status: 'pending',
          });
        }
      } else if (quote.status !== 'pending') {
        // Mark send_offer task as done
        const key = `${quote.id}-send_offer`;
        if (existingTaskMap.has(key)) {
          tasksToComplete.push(existingTaskMap.get(key)!);
        }
      }

      // 3. Follow up (sent > 7 days ago)
      if (quote.status === 'sent' && quote.email_sent_at) {
        const sentDate = new Date(quote.email_sent_at);
        const daysSinceSent = (Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceSent > 7) {
          const key = `${quote.id}-follow_up`;
          if (!existingTaskMap.has(key)) {
            tasksToCreate.push({
              title: `${TASK_TYPES.follow_up.title}: ${quote.customer_name}`,
              description: `Offert skickades för ${Math.floor(daysSinceSent)} dagar sedan`,
              priority: TASK_TYPES.follow_up.priority,
              quote_id: quote.id,
              task_type: 'follow_up',
              status: 'pending',
            });
          }
        }
      }

      // 4. Book installation (accepted, not booked yet)
      if (quote.status === 'accepted' && !quoteBookings.has('installation')) {
        const key = `${quote.id}-book_installation`;
        if (!existingTaskMap.has(key)) {
          tasksToCreate.push({
            title: `${TASK_TYPES.book_installation.title}: ${quote.customer_name}`,
            description: `Kunden har accepterat offerten - boka installation`,
            priority: TASK_TYPES.book_installation.priority,
            quote_id: quote.id,
            task_type: 'book_installation',
            status: 'pending',
          });
        }
      } else if (quoteBookings.has('installation')) {
        const key = `${quote.id}-book_installation`;
        if (existingTaskMap.has(key)) {
          tasksToComplete.push(existingTaskMap.get(key)!);
        }
      }

      // 5. Send ROT link (accepted with ROT, not submitted)
      if (
        quote.status === 'accepted' &&
        quote.apply_rot_deduction &&
        !quote.rot_customer_info
      ) {
        const key = `${quote.id}-send_rot_link`;
        if (!existingTaskMap.has(key)) {
          tasksToCreate.push({
            title: `${TASK_TYPES.send_rot_link.title}: ${quote.customer_name}`,
            description: `Kunden behöver fylla i ROT-uppgifter`,
            priority: TASK_TYPES.send_rot_link.priority,
            quote_id: quote.id,
            task_type: 'send_rot_link',
            status: 'pending',
          });
        }
      } else if (quote.rot_customer_info) {
        const key = `${quote.id}-send_rot_link`;
        if (existingTaskMap.has(key)) {
          tasksToComplete.push(existingTaskMap.get(key)!);
        }
      }
    }

    // Create new tasks
    if (tasksToCreate.length > 0) {
      const { error: createError } = await supabaseAdmin
        .from('tasks')
        .insert(tasksToCreate);

      if (createError) {
        results.errors.push(`Create error: ${createError.message}`);
      } else {
        results.created = tasksToCreate.length;
      }
    }

    // Complete tasks that are no longer needed
    if (tasksToComplete.length > 0) {
      const { error: completeError } = await supabaseAdmin
        .from('tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .in('id', tasksToComplete);

      if (completeError) {
        results.errors.push(`Complete error: ${completeError.message}`);
      } else {
        results.completed = tasksToComplete.length;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (err) {
    console.error('Task sync error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
