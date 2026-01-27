import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/session';
import { listQuoteRequests, getQuoteCounts } from '@/lib/quotes';
import type { QuoteStatus } from '@/lib/types/quote';

export async function GET(request: Request) {
  // Check authentication
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as QuoteStatus | null;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await listQuoteRequests({
      status: status || undefined,
      search,
      limit,
      offset,
    });

    const counts = await getQuoteCounts();

    return NextResponse.json({
      ...result,
      counts,
    });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hämtning av offerter' },
      { status: 500 }
    );
  }
}
