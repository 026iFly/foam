import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendFollowUpEmail } from '@/lib/email';
import { sendDiscordNotification } from '@/lib/discord';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ReminderSettings {
  first_reminder_days: number;
  second_reminder_days: number;
  max_reminders: number;
  reminder_interval_days: number;
}

async function getReminderSettings(): Promise<ReminderSettings> {
  const { data } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', 'reminder_settings')
    .single();

  const defaults: ReminderSettings = {
    first_reminder_days: 3,
    second_reminder_days: 5,
    max_reminders: 3,
    reminder_interval_days: 3,
  };

  if (!data?.value) return defaults;
  const val = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
  return { ...defaults, ...val };
}

/**
 * Cron job: Send reminders for unsigned offers
 * Runs daily at 09:00 CET
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
    const settings = await getReminderSettings();

    // Find all sent offers that haven't been responded to
    const { data: offersForFollowUp } = await supabaseAdmin
      .from('quote_requests')
      .select('id, customer_name, customer_email, quote_number, quote_valid_until, offer_token, email_sent_at, reminder_count, last_reminder_at')
      .eq('status', 'sent')
      .not('offer_token', 'is', null)
      .not('email_sent_at', 'is', null)
      .is('accepted_at', null)
      .is('rejected_at', null);

    for (const offer of offersForFollowUp || []) {
      if (!offer.email_sent_at) continue;

      const reminderCount = offer.reminder_count || 0;
      if (reminderCount >= settings.max_reminders) continue;

      const sentDate = new Date(offer.email_sent_at);
      const daysSinceSent = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));

      // Check if enough time has passed since last reminder
      if (offer.last_reminder_at) {
        const lastReminder = new Date(offer.last_reminder_at);
        const daysSinceLastReminder = Math.floor((now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastReminder < settings.reminder_interval_days) continue;
      }

      let shouldSendEmail = false;
      let shouldSendDiscord = false;

      if (reminderCount === 0 && daysSinceSent >= settings.first_reminder_days) {
        shouldSendEmail = true;
      } else if (reminderCount === 1 && daysSinceSent >= settings.second_reminder_days) {
        shouldSendDiscord = true;
      } else if (reminderCount >= 2) {
        // Alternate between email and Discord for subsequent reminders
        if (reminderCount % 2 === 0) {
          shouldSendEmail = true;
        } else {
          shouldSendDiscord = true;
        }
      }

      if (shouldSendEmail) {
        try {
          await sendFollowUpEmail({
            customer_name: offer.customer_name,
            customer_email: offer.customer_email,
            quote_number: offer.quote_number || undefined,
            quote_valid_until: offer.quote_valid_until || undefined,
            offer_token: offer.offer_token!,
          });

          await supabaseAdmin
            .from('quote_requests')
            .update({
              reminder_count: reminderCount + 1,
              last_reminder_at: now.toISOString(),
            })
            .eq('id', offer.id);

          results.followUpsSent++;
        } catch (err) {
          results.errors.push(`Follow-up email failed for offer #${offer.id}: ${err}`);
        }
      }

      if (shouldSendDiscord) {
        try {
          await sendDiscordNotification({
            embeds: [{
              title: `Offert utan svar (påminnelse ${reminderCount + 1})`,
              description: `${offer.customer_name} har inte svarat på offert ${offer.quote_number || `#${offer.id}`}`,
              color: 0xeab308,
              fields: [
                { name: 'Skickad', value: sentDate.toLocaleDateString('sv-SE'), inline: true },
                { name: 'Dagar sedan', value: `${daysSinceSent} dagar`, inline: true },
                { name: 'Giltig till', value: offer.quote_valid_until ? new Date(offer.quote_valid_until).toLocaleDateString('sv-SE') : 'Ej satt', inline: true },
              ],
              footer: { text: `Påminnelse ${reminderCount + 1} av ${settings.max_reminders}` },
              timestamp: new Date().toISOString(),
            }],
          });

          await supabaseAdmin
            .from('quote_requests')
            .update({
              reminder_count: reminderCount + 1,
              last_reminder_at: now.toISOString(),
            })
            .eq('id', offer.id);

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
