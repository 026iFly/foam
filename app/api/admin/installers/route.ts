import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all installers with priority, type, hardplast status
export async function GET() {
  try {
    const { data: installers, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('role', 'installer')
      .order('priority_order', { ascending: true })
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Error fetching installers:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich with upcoming bookings count
    const enrichedInstallers = await Promise.all(
      (installers || []).map(async (installer) => {
        const { count } = await supabaseAdmin
          .from('booking_installers')
          .select('*', { count: 'exact', head: true })
          .eq('installer_id', installer.id)
          .eq('status', 'accepted');

        const hardplastValid = !installer.hardplast_expiry ||
          new Date(installer.hardplast_expiry) >= new Date();

        return {
          ...installer,
          upcoming_bookings: count || 0,
          hardplast_valid: hardplastValid,
        };
      })
    );

    return NextResponse.json({ installers: enrichedInstallers });
  } catch (err) {
    console.error('Installers GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
