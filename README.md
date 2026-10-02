# Oversite Customs — Server Starting Pack Bot

Starter build for the configurable Oversite Customs bot.

## Current build
- `/setup` dashboard
- Discord-native channel/category/role selectors
- ER:LC API-key modal with encrypted-at-rest storage
- Session channel + ping role setup
- Ticket panel/category/support-role/log-channel setup
- `/session start|boost|full|end`
- `/disconnect` with two confirmations
- Disconnect only removes tracked session messages and ER:LC/session configuration
- **Ticket channels are never deleted by `/disconnect`**

## Install
1. Install Node.js 22+.
2. Copy `.env.example` to `.env`.
3. Fill in `DISCORD_TOKEN`, `CLIENT_ID`, and `DEV_GUILD_ID`.
4. Generate `CONFIG_ENCRYPTION_KEY` with `openssl rand -hex 32`.
5. `npm install`
6. `npm run deploy`
7. `npm start`

During development, commands are registered to `DEV_GUILD_ID` so changes appear quickly.

## Next build
The ER:LC client is isolated in `src/lib/erlc.js`. Confirm the current official PRC API base URL/auth contract before enabling live requests in production.
