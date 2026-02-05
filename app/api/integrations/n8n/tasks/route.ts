import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple API key auth for n8n
function verifyApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = process.env.N8N_API_KEY;

  if (!expectedKey) {
    console.warn('N8N_API_KEY not set - allowing request (set this in production!)');
    return true;
  }

  return apiKey === expectedKey;
}

// GET - List tasks (for Discord bot)
export async function GET(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const includeCompleted = searchParams.get('include_completed') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = supabaseAdmin
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        due_date,
        task_type,
        created_at,
        quote_requests (
          id,
          customer_name,
          quote_number
        )
      `)
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    } else if (!includeCompleted) {
      query = query.in('status', ['pending', 'in_progress']);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data: tasks, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format for easier consumption
    const formatted = tasks?.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      dueDate: t.due_date,
      type: t.task_type,
      customerName: (t.quote_requests as { customer_name?: string } | null)?.customer_name,
      quoteNumber: (t.quote_requests as { quote_number?: string } | null)?.quote_number,
    }));

    return NextResponse.json({
      success: true,
      count: formatted?.length || 0,
      tasks: formatted || [],
    });
  } catch (err) {
    console.error('n8n tasks GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Create a task (for Discord bot)
export async function POST(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, priority = 'medium', due_date, quote_id } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }

    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        title,
        description: description || null,
        priority,
        due_date: due_date || null,
        quote_id: quote_id || null,
        task_type: 'custom',
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
      },
    });
  } catch (err) {
    console.error('n8n tasks POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT - Update a task (mark complete, change status, etc.)
export async function PUT(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, priority, title, description, due_date } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }
    }

    if (priority) updateData.priority = priority;
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (due_date !== undefined) updateData.due_date = due_date;

    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
      },
    });
  } catch (err) {
    console.error('n8n tasks PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
