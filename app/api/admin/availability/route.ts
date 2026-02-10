import { NextRequest, NextResponse } from 'next/server';
import { getAllAvailability, getAvailableInstallers } from '@/lib/installer-availability';

// GET - Get installer availability
// ?date=2026-03-15 → single date
// ?from=2026-03-01&to=2026-03-31 → date range
// &slot=full|morning|afternoon
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const slot = (searchParams.get('slot') || 'full') as 'full' | 'morning' | 'afternoon';

    if (date) {
      const results = await getAvailableInstallers(date, slot);
      return NextResponse.json({ date, slot, installers: results });
    }

    if (from && to) {
      const results = await getAllAvailability(from, to, slot);
      return NextResponse.json({ from, to, slot, availability: results });
    }

    return NextResponse.json(
      { error: 'Provide ?date= or ?from=&to= query params' },
      { status: 400 }
    );
  } catch (err) {
    console.error('Availability GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
