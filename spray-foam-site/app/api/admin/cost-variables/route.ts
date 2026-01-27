import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAuthenticated } from '@/lib/session';

// GET - Fetch all cost variables
export async function GET(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: variables, error } = await supabase
      .from('cost_variables')
      .select('*')
      .order('category')
      .order('variable_key');

    if (error) {
      console.error('Error fetching cost variables:', error);
      return NextResponse.json(
        { error: 'Failed to fetch cost variables' },
        { status: 500 }
      );
    }

    return NextResponse.json({ variables });
  } catch (error) {
    console.error('Error fetching cost variables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost variables' },
      { status: 500 }
    );
  }
}

// PUT - Update cost variable
export async function PUT(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, variable_value } = await request.json();

    if (!id || variable_value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('cost_variables')
      .update({ variable_value })
      .eq('id', id);

    if (error) {
      console.error('Error updating cost variable:', error);
      return NextResponse.json(
        { error: 'Failed to update cost variable' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating cost variable:', error);
    return NextResponse.json(
      { error: 'Failed to update cost variable' },
      { status: 500 }
    );
  }
}
