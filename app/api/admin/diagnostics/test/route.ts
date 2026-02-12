import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getCurrentUser } from '@/lib/supabase-auth';
import { sendEmail } from '@/lib/email';
import { sendCustomNotification } from '@/lib/discord';

// POST - Send test email or Discord message
export async function POST(request: NextRequest) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type } = body as { type: 'email' | 'discord' };

    if (type === 'email') {
      const user = await getCurrentUser();
      const email = user?.email;
      if (!email) {
        return NextResponse.json({ error: 'Ingen e-post hittad' }, { status: 400 });
      }

      const success = await sendEmail({
        to: email,
        subject: 'Intellifoam - Testmeddelande',
        text: 'Detta är ett testmeddelande från Intellifoam diagnostik.',
        html: '<p>Detta är ett <strong>testmeddelande</strong> från Intellifoam diagnostik.</p>',
      }, { event_type: 'test' });

      return NextResponse.json({ success, message: success ? `Testmail skickat till ${email}` : 'Kunde inte skicka e-post' });
    }

    if (type === 'discord') {
      const success = await sendCustomNotification(
        'Testmeddelande',
        'Detta är ett testmeddelande från Intellifoam diagnostik.',
        'info'
      );

      return NextResponse.json({ success, message: success ? 'Discord-meddelande skickat' : 'Kunde inte skicka till Discord' });
    }

    return NextResponse.json({ error: 'Ogiltig typ' }, { status: 400 });
  } catch (err) {
    console.error('Diagnostics test error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
