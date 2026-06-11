/**
 * Discord Bot (serverless) — replaces the OpenClaw/n8n bot server.
 *
 * Two halves:
 *  1. REST helpers for posting messages with interactive buttons
 *     (requires DISCORD_BOT_TOKEN + DISCORD_CHANNEL_ID)
 *  2. Ed25519 signature verification for the interactions endpoint
 *     (requires DISCORD_PUBLIC_KEY)
 *
 * No always-on process needed — Discord delivers slash commands and
 * button clicks as HTTPS POSTs to /api/discord/interactions.
 */

import crypto from 'crypto';

const DISCORD_API = 'https://discord.com/api/v10';

export function isDiscordBotConfigured(): boolean {
  return !!(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_CHANNEL_ID);
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  timestamp?: string;
}

export interface DiscordButton {
  label: string;
  customId: string;
  /** 1=blurple, 2=gray, 3=green, 4=red */
  style: 1 | 2 | 3 | 4;
}

/**
 * Post a message to the team channel via the bot token.
 * Unlike webhook messages, bot messages can carry interactive buttons.
 */
export async function postBotMessage(options: {
  content?: string;
  embeds?: DiscordEmbed[];
  buttons?: DiscordButton[];
  channelId?: string;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = options.channelId || process.env.DISCORD_CHANNEL_ID;

  if (!token || !channelId) {
    return { ok: false, error: 'Discord bot not configured (DISCORD_BOT_TOKEN / DISCORD_CHANNEL_ID)' };
  }

  const body: Record<string, unknown> = {
    content: options.content,
    embeds: options.embeds,
  };

  if (options.buttons && options.buttons.length > 0) {
    body.components = [
      {
        type: 1, // action row
        components: options.buttons.map((b) => ({
          type: 2, // button
          label: b.label,
          custom_id: b.customId,
          style: b.style,
        })),
      },
    ];
  }

  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Discord bot message error:', res.status, text);
      return { ok: false, error: `HTTP ${res.status}: ${text}` };
    }

    const data = await res.json();
    return { ok: true, messageId: data.id };
  } catch (err) {
    console.error('Discord bot message error:', err);
    return { ok: false, error: (err as Error).message };
  }
}

/**
 * Verify that an interaction request really comes from Discord.
 * Discord signs (timestamp + rawBody) with the app's Ed25519 key.
 */
export function verifyDiscordSignature(
  rawBody: string,
  signatureHex: string | null,
  timestamp: string | null
): boolean {
  const publicKeyHex = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKeyHex || !signatureHex || !timestamp) return false;

  try {
    // Wrap the raw 32-byte key in a SPKI DER header so node:crypto accepts it
    const der = Buffer.concat([
      Buffer.from('302a300506032b6570032100', 'hex'),
      Buffer.from(publicKeyHex, 'hex'),
    ]);
    const key = crypto.createPublicKey({ key: der, format: 'der', type: 'spki' });
    return crypto.verify(
      null,
      Buffer.from(timestamp + rawBody),
      key,
      Buffer.from(signatureHex, 'hex')
    );
  } catch (err) {
    console.error('Discord signature verification error:', err);
    return false;
  }
}
