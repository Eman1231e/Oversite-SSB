import 'dotenv/config';
import { REST, Routes } from 'discord.js';

import * as setup from './commands/setup.js';
import * as session from './commands/session.js';
import * as disconnect from './commands/disconnect.js';

if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
  throw new Error('Missing DISCORD_TOKEN or CLIENT_ID.');
}

const commands = [
  setup.data,
  session.data,
  disconnect.data
].map(command => command.toJSON());

const rest = new REST({ version: '10' })
  .setToken(process.env.DISCORD_TOKEN);

console.log(`Deploying ${commands.length} GLOBAL commands...`);

try {
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );

  console.log(`Successfully deployed ${commands.length} GLOBAL commands.`);
} catch (error) {
  console.error('Failed to deploy global commands:');
  console.error(error);
  process.exit(1);
}
