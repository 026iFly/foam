import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// This endpoint is called by Vercel Cron to keep the Supabase database active
// Supabase pauses free-tier databases after 7 days of inactivity
// We call this every 72 hours to prevent the database from being paused

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron (optional but recommended)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow in development or if CRON_SECRET is not set
    if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Update the keep_alive table to ping the database
    const { error: updateError } = await supabase
      .from('keep_alive')
      .update({ last_ping: new Date().toISOString() })
      .eq('id', 1);

    if (updateError) {
      // If update fails (e.g., no row exists), try to insert
      const { error: insertError } = await supabase
        .from('keep_alive')
        .insert({ last_ping: new Date().toISOString() });

      if (insertError) {
        console.error('Keep-alive error:', insertError);
        return NextResponse.json(
          { error: 'Failed to ping database', details: insertError.message },
          { status: 500 }
        );
      }
    }

    // Also do a simple query to ensure the connection is active
    const { data, error } = await supabase
      .from('keep_alive')
      .select('last_ping')
      .limit(1)
      .single();

    if (error) {
      console.error('Keep-alive query error:', error);
      return NextResponse.json(
        { error: 'Failed to query database', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Database kept alive',
      last_ping: data?.last_ping,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Keep-alive error:', error);
    return NextResponse.json(
      { error: 'Keep-alive failed' },
      { status: 500 }
    );
  }
}
