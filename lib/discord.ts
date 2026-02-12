/**
 * Discord Webhook Integration
 * Sends notifications to Discord channel
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
  };
  timestamp?: string;
}

interface DiscordMessage {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

// Color codes for different message types
const COLORS = {
  success: 0x22c55e, // Green
  warning: 0xeab308, // Yellow
  error: 0xef4444,   // Red
  info: 0x3b82f6,    // Blue
  neutral: 0x6b7280, // Gray
};

/**
 * Send a message to Discord
 */
export async function sendDiscordNotification(
  message: DiscordMessage,
  logMeta?: { event_type?: string; reference_type?: string; reference_id?: number }
): Promise<boolean> {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn('Discord webhook URL not configured');
    await logDiscordNotification(logMeta?.event_type || 'unknown', 'skipped', 'Webhook not configured', logMeta);
    return false;
  }

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'Intellifoam',
        ...message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord webhook error:', response.status, errorText);
      await logDiscordNotification(logMeta?.event_type || 'unknown', 'failed', `HTTP ${response.status}: ${errorText}`, logMeta);
      return false;
    }

    await logDiscordNotification(logMeta?.event_type || 'custom', 'sent', undefined, logMeta);
    return true;
  } catch (error) {
    console.error('Discord notification error:', error);
    await logDiscordNotification(logMeta?.event_type || 'unknown', 'failed', String(error), logMeta);
    return false;
  }
}

async function logDiscordNotification(
  event_type: string,
  status: string,
  error_message?: string,
  meta?: { reference_type?: string; reference_id?: number }
) {
  try {
    await supabaseAdmin.from('notification_log').insert({
      channel: 'discord',
      event_type,
      recipient: 'webhook',
      reference_type: meta?.reference_type,
      reference_id: meta?.reference_id,
      status,
      error_message: error_message || null,
    });
  } catch (err) {
    console.error('Failed to log discord notification:', err);
  }
}

/**
 * Notify about a new quote request
 */
export async function notifyNewQuoteRequest(quote: {
  id: number;
  customer_name: string;
  customer_address: string;
  total_incl_vat?: number;
}): Promise<boolean> {
  const value = quote.total_incl_vat
    ? new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(quote.total_incl_vat)
    : 'Ej beräknat';

  return sendDiscordNotification({
    embeds: [{
      title: '🆕 Ny offertförfrågan',
      description: `En ny offertförfrågan har kommit in!`,
      color: COLORS.info,
      fields: [
        { name: 'Kund', value: quote.customer_name, inline: true },
        { name: 'Adress', value: quote.customer_address, inline: true },
        { name: 'Värde', value: value, inline: true },
      ],
      footer: { text: `Offert #${quote.id}` },
      timestamp: new Date().toISOString(),
    }],
  });
}

/**
 * Notify about a sent offer
 */
export async function notifyOfferSent(quote: {
  id: number;
  quote_number?: string;
  customer_name: string;
  customer_email: string;
  total_incl_vat?: number;
}): Promise<boolean> {
  const value = quote.total_incl_vat
    ? new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(quote.total_incl_vat)
    : 'Ej beräknat';

  return sendDiscordNotification({
    embeds: [{
      title: '📧 Offert skickad',
      description: `Offert har skickats till ${quote.customer_name}`,
      color: COLORS.info,
      fields: [
        { name: 'Offertnummer', value: quote.quote_number || `#${quote.id}`, inline: true },
        { name: 'E-post', value: quote.customer_email, inline: true },
        { name: 'Värde', value: value, inline: true },
      ],
      footer: { text: 'Väntar på kundens svar' },
      timestamp: new Date().toISOString(),
    }],
  });
}

/**
 * Notify about an accepted offer
 */
export async function notifyOfferAccepted(quote: {
  id: number;
  quote_number?: string;
  customer_name: string;
  total_incl_vat?: number;
}): Promise<boolean> {
  const value = quote.total_incl_vat
    ? new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(quote.total_incl_vat)
    : 'Ej beräknat';

  return sendDiscordNotification({
    embeds: [{
      title: '✅ Offert accepterad!',
      description: `${quote.customer_name} har accepterat offerten!`,
      color: COLORS.success,
      fields: [
        { name: 'Offertnummer', value: quote.quote_number || `#${quote.id}`, inline: true },
        { name: 'Värde', value: value, inline: true },
      ],
      footer: { text: 'Dags att boka installation!' },
      timestamp: new Date().toISOString(),
    }],
  });
}

/**
 * Notify about an rejected offer
 */
export async function notifyOfferRejected(quote: {
  id: number;
  quote_number?: string;
  customer_name: string;
}): Promise<boolean> {
  return sendDiscordNotification({
    embeds: [{
      title: '❌ Offert avböjd',
      description: `${quote.customer_name} har avböjt offerten.`,
      color: COLORS.error,
      fields: [
        { name: 'Offertnummer', value: quote.quote_number || `#${quote.id}`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    }],
  });
}

/**
 * Notify about low stock
 */
export async function notifyLowStock(material: {
  name: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
}): Promise<boolean> {
  return sendDiscordNotification({
    embeds: [{
      title: '📦 Materialbrist!',
      description: `${material.name} är under minimigräns`,
      color: COLORS.warning,
      fields: [
        { name: 'Nuvarande lager', value: `${material.current_stock} ${material.unit}`, inline: true },
        { name: 'Minimigräns', value: `${material.minimum_stock} ${material.unit}`, inline: true },
      ],
      footer: { text: 'Dags att beställa mer!' },
      timestamp: new Date().toISOString(),
    }],
  });
}

/**
 * Notify about shipment arriving
 */
export async function notifyShipmentArriving(shipment: {
  supplier?: string;
  expected_date: string;
  items?: Array<{ name: string; quantity: number; unit: string }>;
}): Promise<boolean> {
  const itemsList = shipment.items
    ?.map(i => `• ${i.name}: ${i.quantity} ${i.unit}`)
    .join('\n') || 'Inga detaljer';

  return sendDiscordNotification({
    embeds: [{
      title: '🚚 Leverans anländer!',
      description: `En leverans från ${shipment.supplier || 'okänd leverantör'} förväntas idag.`,
      color: COLORS.info,
      fields: [
        { name: 'Innehåll', value: itemsList },
      ],
      timestamp: new Date().toISOString(),
    }],
  });
}

/**
 * Notify about booked installation
 */
export async function notifyInstallationBooked(booking: {
  customer_name: string;
  customer_address: string;
  scheduled_date: string;
}): Promise<boolean> {
  const formattedDate = new Date(booking.scheduled_date).toLocaleDateString('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return sendDiscordNotification({
    embeds: [{
      title: '📅 Installation bokad',
      description: `Ny installation bokad hos ${booking.customer_name}`,
      color: COLORS.success,
      fields: [
        { name: 'Datum', value: formattedDate, inline: true },
        { name: 'Adress', value: booking.customer_address, inline: true },
      ],
      timestamp: new Date().toISOString(),
    }],
  });
}

/**
 * Notify about a rescheduled booking
 */
export async function notifyBookingRescheduled(booking: {
  id: number;
  customer_name: string;
  old_date: string;
  new_date: string;
}): Promise<boolean> {
  const oldFormatted = new Date(booking.old_date).toLocaleDateString('sv-SE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const newFormatted = new Date(booking.new_date).toLocaleDateString('sv-SE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return sendDiscordNotification({
    embeds: [{
      title: 'Bokning ombokad',
      description: `${booking.customer_name} har ombokat sin installation`,
      color: COLORS.warning,
      fields: [
        { name: 'Tidigare datum', value: oldFormatted, inline: true },
        { name: 'Nytt datum', value: newFormatted, inline: true },
      ],
      footer: { text: `Bokning #${booking.id}` },
      timestamp: new Date().toISOString(),
    }],
  });
}

/**
 * Notify about a cancelled booking
 */
export async function notifyBookingCancelled(booking: {
  id: number;
  customer_name: string;
  scheduled_date: string;
}): Promise<boolean> {
  return sendDiscordNotification({
    embeds: [{
      title: 'Bokning avbokad',
      description: `${booking.customer_name} har avbokat sin installation`,
      color: COLORS.error,
      fields: [
        { name: 'Datum', value: new Date(booking.scheduled_date).toLocaleDateString('sv-SE'), inline: true },
      ],
      footer: { text: `Bokning #${booking.id}` },
      timestamp: new Date().toISOString(),
    }],
  });
}

/**
 * Notify about a quote update/recalculation
 */
export async function notifyQuoteUpdated(quote: {
  id: number;
  quote_number?: string;
  customer_name: string;
  total_incl_vat?: number;
  change_description?: string;
}): Promise<boolean> {
  const value = quote.total_incl_vat
    ? new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(quote.total_incl_vat)
    : 'Ej beräknat';

  return sendDiscordNotification({
    embeds: [{
      title: 'Offert uppdaterad',
      description: quote.change_description || `Offert för ${quote.customer_name} har uppdaterats`,
      color: COLORS.info,
      fields: [
        { name: 'Offertnummer', value: quote.quote_number || `#${quote.id}`, inline: true },
        { name: 'Nytt värde', value: value, inline: true },
      ],
      footer: { text: `Offert #${quote.id}` },
      timestamp: new Date().toISOString(),
    }],
  });
}

/**
 * Send a custom message
 */
export async function sendCustomNotification(
  title: string,
  description: string,
  type: 'success' | 'warning' | 'error' | 'info' | 'neutral' = 'info'
): Promise<boolean> {
  return sendDiscordNotification({
    embeds: [{
      title,
      description,
      color: COLORS[type],
      timestamp: new Date().toISOString(),
    }],
  });
}
