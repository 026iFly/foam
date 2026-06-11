# Serverless Discord-bot (ersätter OpenClaw/n8n)

StorSprut körs nu helt inne i Vercel-appen — ingen extern bot-server behövs.
Discord skickar slash-kommandon och knapptryck som signerade HTTPS-anrop till
`/api/discord/interactions`.

## Vad som ingår

| Funktion | Hur |
|---|---|
| Installatörer accepterar/avböjer bokningar i Discord | Knappar (Acceptera/Avböj) på bekräftelsemeddelanden, hanteras av `/api/discord/interactions` |
| Teamfrågor i Discord | Slash-kommandon: `/status`, `/bokningar`, `/uppgifter`, `/material`, `/sök` |
| Kalendersynk | Vercel cron varannan timme: `/api/cron/sync-calendar` |
| Notiser (nya offerter, lågt lager m.m.) | Oförändrat — `DISCORD_WEBHOOK_URL` som tidigare |

E-postlänkar (`/confirm/[token]`) och installatörsdashboarden fungerar som
tidigare och är oberoende av Discord.

## Engångsinstallation

1. **Discord Developer Portal** ([discord.com/developers/applications](https://discord.com/developers/applications))
   - Använd den befintliga StorSprut-appen, eller skapa en ny (New Application).
   - Under **General Information**: kopiera `Application ID` och `Public Key`.
   - Under **Bot**: kopiera/återställ `Token`. Bjud in boten till servern via
     OAuth2 URL Generator (scope: `bot`, permissions: `Send Messages`).
   - Kopiera kanal-ID:t för teamkanalen (högerklicka på kanalen → Copy Channel ID,
     kräver Developer Mode i Discord-inställningarna).

2. **Miljövariabler i Vercel** (Settings → Environment Variables):
   ```
   DISCORD_APPLICATION_ID=...
   DISCORD_PUBLIC_KEY=...
   DISCORD_BOT_TOKEN=...
   DISCORD_CHANNEL_ID=...
   ```
   (`DISCORD_WEBHOOK_URL`, `N8N_API_KEY`, `CRON_SECRET` finns redan.)

3. **Deploya**, och sätt sedan i Developer Portal under General Information:
   ```
   Interactions Endpoint URL: https://intellifoam.se/api/discord/interactions
   ```
   Discord verifierar endpointen direkt när du sparar (kräver att
   `DISCORD_PUBLIC_KEY` är satt och deployen är live).

4. **Registrera slash-kommandona** (en gång, från din dator):
   ```
   node --env-file=.env.local scripts/register-discord-commands.mjs
   ```

## Beteende

- Utan `DISCORD_BOT_TOKEN`/`DISCORD_CHANNEL_ID` faller bekräftelsemeddelanden
  tillbaka till den gamla webhook-varianten (utan knappar) — e-post och
  dashboard fungerar alltid.
- Knapptrycken är idempotenta: redan besvarade bokningar ger ett diskret
  felmeddelande i stället för dubbelregistrering.
- Vid avböj tilldelas nästa tillgängliga installatör automatiskt (samma
  logik som tidigare, `lib/auto-assign.ts`).
- Den gamla webhooken `/api/webhooks/discord/confirm` finns kvar om något
  externt fortfarande anropar den.

## Ej ersatt (medvetet)

- StorSpruts AI-chat (fritextfrågor via LLM) — slash-kommandona täcker samma
  data deterministiskt. Vill ni ha fritext igen kan ett `/fråga`-kommando
  läggas till som anropar ett LLM-API.
