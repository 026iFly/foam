/**
 * POST /api/discord/interactions
 *
 * Serverless Discord bot endpoint — replaces the OpenClaw/n8n bot server.
 * Discord delivers slash commands (/status, /bokningar, /uppgifter,
 * /material, /sök) and button clicks (installer accept/decline) here
 * as signed HTTPS requests.
 *
 * Setup: set this URL as "Interactions Endpoint URL" in the Discord
 * Developer Portal and configure DISCORD_PUBLIC_KEY. See
 * docs/discord-serverless-bot.md.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyDiscordSignature } from '@/lib/discord-bot';
import { handleInstallerAccept, handleInstallerDecline } from '@/lib/auto-assign';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Interaction types
const PING = 1;
const APPLICATION_COMMAND = 2;
const MESSAGE_COMPONENT = 3;

// Response types
const PONG = 1;
const CHANNEL_MESSAGE = 4;
const UPDATE_MESSAGE = 7;

const EPHEMERAL = 64;

const COLORS = {
  success: 0x22c55e,
  warning: 0xeab308,
  error: 0xef4444,
  info: 0x3b82f6,
  neutral: 0x6b7280,
};

const QUOTE_STATUS_SV: Record<string, string> = {
  pending: 'Väntar',
  reviewed: 'Granskad',
  quoted: 'Offererad',
  sent: 'Skickad',
  accepted: 'Accepterad',
  rejected: 'Avvisad',
  completed: 'Klar',
  cancelled: 'Avbruten',
};

function stockholmToday(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });
}

function json(payload: unknown) {
  return NextResponse.json(payload);
}

function ephemeral(content: string) {
  return json({ type: CHANNEL_MESSAGE, data: { content, flags: EPHEMERAL } });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const valid = verifyDiscordSignature(
    rawBody,
    request.headers.get('x-signature-ed25519'),
    request.headers.get('x-signature-timestamp')
  );
  if (!valid) {
    return NextResponse.json({ error: 'Invalid request signature' }, { status: 401 });
  }

  const interaction = JSON.parse(rawBody);

  try {
    if (interaction.type === PING) {
      return json({ type: PONG });
    }

    if (interaction.type === MESSAGE_COMPONENT) {
      return await handleButton(interaction);
    }

    if (interaction.type === APPLICATION_COMMAND) {
      return await handleCommand(interaction);
    }

    return ephemeral('Okänd interaktionstyp.');
  } catch (err) {
    console.error('Discord interaction error:', err);
    return ephemeral('Något gick fel. Försök igen eller använd e-postlänken.');
  }
}

/**
 * Installer accept/decline buttons.
 * custom_id format: confirm:accept:<token> | confirm:decline:<token>
 */
async function handleButton(interaction: {
  data: { custom_id: string };
  message?: { embeds?: Array<Record<string, unknown>> };
  member?: { user?: { global_name?: string; username?: string } };
  user?: { global_name?: string; username?: string };
}) {
  const customId = interaction.data.custom_id || '';
  const [scope, action, token] = customId.split(':');

  if (scope !== 'confirm' || !token || !['accept', 'decline'].includes(action)) {
    return ephemeral('Okänd knapp.');
  }

  const clickedBy =
    interaction.member?.user?.global_name ||
    interaction.member?.user?.username ||
    interaction.user?.global_name ||
    interaction.user?.username ||
    'okänd';

  // Resolve the confirmation request from the token baked into the button
  const { data: confirmReq } = await supabaseAdmin
    .from('booking_confirmation_requests')
    .select('booking_id, installer_id, status')
    .eq('token', token)
    .eq('channel', 'discord')
    .single();

  if (!confirmReq) {
    return ephemeral('Bekräftelseförfrågan hittades inte (kan vara borttagen).');
  }

  // Idempotency: check the actual assignment status
  const { data: assignment } = await supabaseAdmin
    .from('booking_installers')
    .select('status')
    .eq('booking_id', confirmReq.booking_id)
    .eq('installer_id', confirmReq.installer_id)
    .single();

  if (!assignment) {
    return ephemeral('Installatören är inte längre tilldelad denna bokning.');
  }

  if (assignment.status !== 'pending') {
    const already = assignment.status === 'accepted' ? 'accepterad' : 'avböjd';
    return ephemeral(`Bokningen är redan ${already}.`);
  }

  if (action === 'accept') {
    await handleInstallerAccept(confirmReq.booking_id, confirmReq.installer_id);
  } else {
    await handleInstallerDecline(confirmReq.booking_id, confirmReq.installer_id);
  }

  // handleInstallerAccept/Decline only close rows that are still pending,
  // so explicitly stamp the discord channel row too
  await supabaseAdmin
    .from('booking_confirmation_requests')
    .update({
      status: action === 'accept' ? 'accepted' : 'declined',
      responded_at: new Date().toISOString(),
    })
    .eq('token', token)
    .eq('status', 'pending');

  // Update the original message: recolor, set outcome, drop the buttons
  const original = interaction.message?.embeds?.[0] || {};
  const accepted = action === 'accept';
  const updatedEmbed = {
    ...original,
    color: accepted ? COLORS.success : COLORS.error,
    description: accepted
      ? `✅ Accepterad av ${clickedBy}`
      : `❌ Avböjd av ${clickedBy} — ersättare tilldelas automatiskt`,
  };

  return json({
    type: UPDATE_MESSAGE,
    data: { embeds: [updatedEmbed], components: [] },
  });
}

/** Slash commands — team queries that StorSprut/OpenClaw used to answer */
async function handleCommand(interaction: {
  data: { name: string; options?: Array<{ name: string; value: string | number }> };
}) {
  const name = interaction.data.name;
  const options = interaction.data.options || [];
  const getOption = (key: string) => options.find((o) => o.name === key)?.value;

  switch (name) {
    case 'status':
      return await cmdStatus();
    case 'bokningar':
      return await cmdBookings(Number(getOption('dagar')) || 7);
    case 'uppgifter':
      return await cmdTasks();
    case 'material':
      return await cmdMaterials();
    case 'sök':
      return await cmdSearch(String(getOption('text') || ''));
    default:
      return ephemeral(`Okänt kommando: /${name}`);
  }
}

async function cmdStatus() {
  const today = stockholmToday();

  const [tasksRes, quotesRes, todayRes, upcomingRes] = await Promise.all([
    supabaseAdmin
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'in_progress']),
    supabaseAdmin
      .from('quote_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'reviewed']),
    supabaseAdmin
      .from('bookings')
      .select('id, booking_type, scheduled_time, quote_requests (customer_name)')
      .eq('scheduled_date', today)
      .neq('status', 'cancelled')
      .order('scheduled_time', { ascending: true }),
    supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .gt('scheduled_date', today)
      .neq('status', 'cancelled'),
  ]);

  const todayLines = (todayRes.data || []).map((b) => {
    const customer = (b.quote_requests as { customer_name?: string } | null)?.customer_name || 'Okänd';
    const type = b.booking_type === 'installation' ? 'Installation' : 'Hembesök';
    return `• ${b.scheduled_time || 'Tid ej angiven'} — ${type}: ${customer}`;
  });

  return json({
    type: CHANNEL_MESSAGE,
    data: {
      embeds: [
        {
          title: `Läget idag ${today}`,
          color: COLORS.info,
          fields: [
            { name: 'Öppna uppgifter', value: String(tasksRes.count || 0), inline: true },
            { name: 'Offerter som väntar', value: String(quotesRes.count || 0), inline: true },
            { name: 'Kommande bokningar', value: String(upcomingRes.count || 0), inline: true },
            {
              name: `Dagens bokningar (${todayLines.length})`,
              value: todayLines.length > 0 ? todayLines.join('\n') : 'Inga bokningar idag',
            },
          ],
        },
      ],
    },
  });
}

async function cmdBookings(days: number) {
  const today = stockholmToday();
  const end = new Date();
  end.setDate(end.getDate() + Math.min(Math.max(days, 1), 60));
  const endDate = end.toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id, booking_type, scheduled_date, scheduled_time, status, quote_requests (customer_name, customer_address)')
    .gte('scheduled_date', today)
    .lte('scheduled_date', endDate)
    .neq('status', 'cancelled')
    .order('scheduled_date', { ascending: true })
    .limit(15);

  const lines = (bookings || []).map((b) => {
    const q = b.quote_requests as { customer_name?: string; customer_address?: string } | null;
    const type = b.booking_type === 'installation' ? 'Installation' : 'Hembesök';
    const confirmed = b.status === 'confirmed' ? ' ✅' : '';
    return `**${b.scheduled_date}** ${b.scheduled_time || ''} — ${type}: ${q?.customer_name || 'Okänd'}${confirmed}\n${q?.customer_address || ''}`;
  });

  return json({
    type: CHANNEL_MESSAGE,
    data: {
      embeds: [
        {
          title: `Bokningar kommande ${days} dagar`,
          description: lines.length > 0 ? lines.join('\n\n') : 'Inga bokningar i perioden.',
          color: COLORS.info,
        },
      ],
    },
  });
}

async function cmdTasks() {
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, status, priority, due_date')
    .in('status', ['pending', 'in_progress'])
    .order('priority', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(15);

  const prioEmoji: Record<string, string> = { urgent: '🔴', high: '🟠', medium: '🟡', low: '⚪' };
  const lines = (tasks || []).map((t) => {
    const due = t.due_date ? ` (förfaller ${t.due_date})` : '';
    return `${prioEmoji[t.priority] || '⚪'} ${t.title}${due}`;
  });

  return json({
    type: CHANNEL_MESSAGE,
    data: {
      embeds: [
        {
          title: `Öppna uppgifter (${lines.length})`,
          description: lines.length > 0 ? lines.join('\n') : 'Inga öppna uppgifter 🎉',
          color: COLORS.warning,
        },
      ],
    },
  });
}

async function cmdMaterials() {
  const { data: materials } = await supabaseAdmin
    .from('materials')
    .select('name, current_stock, minimum_stock, unit')
    .order('name', { ascending: true });

  const lines = (materials || []).map((m) => {
    const low = m.minimum_stock && m.current_stock <= m.minimum_stock;
    const emoji = low ? '🔴' : '🟢';
    return `${emoji} **${m.name}**: ${m.current_stock} ${m.unit || ''} (min ${m.minimum_stock ?? '–'})`;
  });

  const hasLow = (materials || []).some((m) => m.minimum_stock && m.current_stock <= m.minimum_stock);

  return json({
    type: CHANNEL_MESSAGE,
    data: {
      embeds: [
        {
          title: 'Materiallager',
          description: lines.length > 0 ? lines.join('\n') : 'Inga material registrerade.',
          color: hasLow ? COLORS.error : COLORS.success,
        },
      ],
    },
  });
}

async function cmdSearch(query: string) {
  if (!query || query.trim().length < 2) {
    return ephemeral('Ange minst 2 tecken att söka på.');
  }
  const q = query.trim();

  const [quotesRes, bookingsRes] = await Promise.all([
    supabaseAdmin
      .from('quote_requests')
      .select('id, quote_number, customer_name, customer_address, status, total_incl_vat')
      .or(`customer_name.ilike.%${q}%,customer_address.ilike.%${q}%,quote_number.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('bookings')
      .select('id, booking_type, scheduled_date, scheduled_time, status, quote_requests!inner (customer_name)')
      .ilike('quote_requests.customer_name', `%${q}%`)
      .order('scheduled_date', { ascending: false })
      .limit(5),
  ]);

  const quoteLines = (quotesRes.data || []).map((qt) => {
    const price = qt.total_incl_vat ? ` — ${Math.round(qt.total_incl_vat).toLocaleString('sv-SE')} kr` : '';
    return `**${qt.quote_number || `#${qt.id}`}** ${qt.customer_name} (${QUOTE_STATUS_SV[qt.status] || qt.status})${price}\n${qt.customer_address || ''}`;
  });

  const bookingLines = (bookingsRes.data || []).map((b) => {
    const customer = (b.quote_requests as { customer_name?: string } | null)?.customer_name || 'Okänd';
    const type = b.booking_type === 'installation' ? 'Installation' : 'Hembesök';
    return `**${b.scheduled_date}** ${b.scheduled_time || ''} — ${type}: ${customer} (${b.status})`;
  });

  const fields = [];
  if (quoteLines.length > 0) fields.push({ name: `Offerter (${quoteLines.length})`, value: quoteLines.join('\n\n') });
  if (bookingLines.length > 0) fields.push({ name: `Bokningar (${bookingLines.length})`, value: bookingLines.join('\n') });

  return json({
    type: CHANNEL_MESSAGE,
    data: {
      embeds: [
        {
          title: `Sökresultat: "${q}"`,
          description: fields.length === 0 ? 'Inga träffar.' : undefined,
          fields,
          color: COLORS.neutral,
        },
      ],
    },
  });
}
