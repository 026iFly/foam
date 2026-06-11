/**
 * Registers the StorSprut slash commands with Discord.
 * Run once (and again whenever commands change):
 *
 *   DISCORD_APPLICATION_ID=... DISCORD_BOT_TOKEN=... node scripts/register-discord-commands.mjs
 *
 * Or put the vars in .env.local and run: node --env-file=.env.local scripts/register-discord-commands.mjs
 */

const APP_ID = process.env.DISCORD_APPLICATION_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!APP_ID || !BOT_TOKEN) {
  console.error('Set DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN');
  process.exit(1);
}

const commands = [
  {
    name: 'status',
    description: 'Dagens läge: bokningar, uppgifter och offerter',
  },
  {
    name: 'bokningar',
    description: 'Visa kommande bokningar',
    options: [
      {
        name: 'dagar',
        description: 'Antal dagar framåt (standard 7)',
        type: 4, // INTEGER
        required: false,
        min_value: 1,
        max_value: 60,
      },
    ],
  },
  {
    name: 'uppgifter',
    description: 'Visa öppna uppgifter',
  },
  {
    name: 'material',
    description: 'Visa materiallager och lågt saldo',
  },
  {
    name: 'sök',
    description: 'Sök kunder, offerter och bokningar',
    options: [
      {
        name: 'text',
        description: 'Namn, adress eller offertnummer',
        type: 3, // STRING
        required: true,
      },
    ],
  },
];

const res = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/commands`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bot ${BOT_TOKEN}`,
  },
  body: JSON.stringify(commands),
});

if (!res.ok) {
  console.error('Failed:', res.status, await res.text());
  process.exit(1);
}

const data = await res.json();
console.log(`Registered ${data.length} commands:`, data.map((c) => `/${c.name}`).join(', '));
