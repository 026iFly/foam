/**
 * Discord Webhook Integration
 * Sends notifications to Discord channel
 */

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
export async function sendDiscordNotification(message: DiscordMessage): Promise<boolean> {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn('Discord webhook URL not configured');
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
      console.error('Discord webhook error:', response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Discord notification error:', error);
    return false;
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
