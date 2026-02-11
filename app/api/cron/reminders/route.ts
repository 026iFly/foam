import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendFollowUpEmail } from '@/lib/email';
import { sendDiscordNotification } from '@/lib/discord';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Cron job: Send reminders for unsigned offers
 * Runs daily at 09:00 CET
 *
 * - Sends follow-up email 3 days after offer was sent
 * - Sends Discord notification for offers older than 5 days without response
 */
export async function GET(request: Request) {
  // Verify cron auth
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const results = {
    followUpsSent: 0,
    discordAlerts: 0,
    errors: [] as string[],
  };

  try {
    const now = new Date();

    // 1. Find offers sent 3 days ago that haven't been responded to (for follow-up email)
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoDate = threeDaysAgo.toISOString().split('T')[0];

    const { data: offersForFollowUp } = await supabaseAdmin
      .from('quote_requests')
      .select('id, customer_name, customer_email, quote_number, quote_valid_until, offer_token, email_sent_at')
      .eq('status', 'sent')
      .not('offer_token', 'is', null)
      .not('email_sent_at', 'is', null)
      .is('accepted_at', null)
      .is('rejected_at', null);

    for (const offer of offersForFollowUp || []) {
      if (!offer.email_sent_at) continue;

      const sentDate = new Date(offer.email_sent_at);
      const daysSinceSent = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));

      // Send follow-up email exactly on day 3
      if (daysSinceSent === 3) {
        try {
          await sendFollowUpEmail({
            customer_name: offer.customer_name,
            customer_email: offer.customer_email,
            quote_number: offer.quote_number || undefined,
            quote_valid_until: offer.quote_valid_until || undefined,
            offer_token: offer.offer_token!,
          });
          results.followUpsSent++;
        } catch (err) {
          results.errors.push(`Follow-up email failed for offer #${offer.id}: ${err}`);
        }
      }

      // Discord alert for offers older than 5 days
      if (daysSinceSent === 5) {
        try {
          await sendDiscordNotification({
            embeds: [{
              title: 'Offert utan svar i 5 dagar',
              description: `${offer.customer_name} har inte svarat på offert ${offer.quote_number || `#${offer.id}`}`,
              color: 0xeab308,
              fields: [
                { name: 'Skickad', value: sentDate.toLocaleDateString('sv-SE'), inline: true },
                { name: 'Giltig till', value: offer.quote_valid_until ? new Date(offer.quote_valid_until).toLocaleDateString('sv-SE') : 'Ej satt', inline: true },
              ],
              footer: { text: 'Överväg att ringa kunden' },
              timestamp: new Date().toISOString(),
            }],
          });
          results.discordAlerts++;
        } catch (err) {
          results.errors.push(`Discord alert failed for offer #${offer.id}: ${err}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Reminders cron error:', error);
    return NextResponse.json(
      { error: 'Reminders cron failed', details: String(error) },
      { status: 500 }
    );
  }
}
