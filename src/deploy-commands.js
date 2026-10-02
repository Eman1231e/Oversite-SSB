import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import * as setup from './commands/setup.js';
import * as session from './commands/session.js';
import * as disconnect from './commands/disconnect.js';

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID || !process.env.DEV_GUILD_ID) {
  throw new Error('Missing DISCORD_TOKEN, CLIENT_ID, or DEV_GUILD_ID in .env');
}

const commands = [setup.data, session.data, disconnect.data].map(c => c.toJSON());
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
await rest.put(
  Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEV_GUILD_ID),
  { body: commands }
);
console.log(`Deployed ${commands.length} commands.`);
