import 'dotenv/config';
import {
  ActionRowBuilder,
  Client,
  Events,
  GatewayIntentBits,
  ModalBuilder,
  REST,
  Routes,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';

import * as setup from './commands/setup.js';
import * as session from './commands/session.js';
import * as disconnect from './commands/disconnect.js';

import {
  clearSessionConfig,
  getResources,
  removeResource,
  setConfig
} from './db.js';

import { encryptSecret } from './lib/crypto.js';
import { validateErlcKey } from './lib/erlc.js';

import {
  disconnectConfirm,
  sessionSetupView,
  ticketSetupView
} from './ui.js';

if (!process.env.DISCORD_TOKEN) {
  throw new Error('DISCORD_TOKEN is missing.');
}

if (!process.env.CLIENT_ID) {
  throw new Error('CLIENT_ID is missing.');
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = new Map([
  ['setup', setup],
  ['session', session],
  ['disconnect', disconnect]
]);

/*
 * ==========================================
 * GLOBAL COMMAND REGISTRATION
 * ==========================================
 *
 * Commands are registered globally so the
 * bot can be used in multiple Discord servers.
 *
 * Railway should ONLY run:
 *
 * npm start
 *
 * Do NOT use npm run deploy as the Railway
 * Start Command.
 */

async function registerGlobalCommands() {
  const commandData = [
    setup.data,
    session.data,
    disconnect.data
  ].map(command => command.toJSON());

  const rest = new REST({ version: '10' })
    .setToken(process.env.DISCORD_TOKEN);

  console.log(
    `Registering ${commandData.length} global Discord commands...`
  );

  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    {
      body: commandData
    }
  );

  console.log(
    `Successfully registered ${commandData.length} global Discord commands.`
  );
}

client.once(Events.ClientReady, c => {
  console.log(`Oversite Customs online as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    /*
     * SLASH COMMANDS
     */

    if (interaction.isChatInputCommand()) {
      const cmd = commands.get(interaction.commandName);

      if (cmd) {
        await cmd.execute(interaction);
      }

      return;
    }

    /*
     * SETUP MENU
     */

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === 'setup:section'
    ) {
      const section = interaction.values[0];

      if (section === 'erlc') {
        const modal = new ModalBuilder()
          .setCustomId('setup:erlc_modal')
          .setTitle('Connect ER:LC Server');

        const key = new TextInputBuilder()
          .setCustomId('server_key')
          .setLabel('ER:LC Server API Key')
          .setPlaceholder('Paste the key here')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(key)
        );

        await interaction.showModal(modal);
        return;
      }

      if (section === 'sessions') {
        return interaction.update(sessionSetupView());
      }

      if (section === 'tickets') {
        return interaction.update(ticketSetupView());
      }

      if (section === 'branding') {
        return interaction.update({
          content:
            '**Branding editor is next on the build list.**',
          components: []
        });
      }
    }

    /*
     * CHANNEL SELECTORS
     */

    if (interaction.isChannelSelectMenu()) {
      const map = {
        'setup:session_channel': 'session_channel_id',
        'setup:ticket_panel': 'ticket_panel_channel_id',
        'setup:ticket_category': 'ticket_category_id',
        'setup:ticket_logs': 'ticket_log_channel_id'
      };

      if (map[interaction.customId]) {
        setConfig(interaction.guildId, {
          [map[interaction.customId]]:
            interaction.values[0]
        });

        return interaction.reply({
          content: 'Saved.',
          ephemeral: true
        });
      }
    }

    /*
     * ROLE SELECTORS
     */

    if (interaction.isRoleSelectMenu()) {
      const map = {
        'setup:session_role': 'session_ping_role_id',
        'setup:ticket_role': 'ticket_support_role_id'
      };

      if (map[interaction.customId]) {
        setConfig(interaction.guildId, {
          [map[interaction.customId]]:
            interaction.values[0]
        });

        return interaction.reply({
          content: 'Saved.',
          ephemeral: true
        });
      }
    }

    /*
     * ER:LC KEY
     */

    if (
      interaction.isModalSubmit() &&
      interaction.customId === 'setup:erlc_modal'
    ) {
      const serverKey = interaction.fields
        .getTextInputValue('server_key')
        .trim();

      const result = await validateErlcKey(serverKey);

      if (!result.ok) {
        return interaction.reply({
          content: `❌ ${result.message}`,
          ephemeral: true
        });
      }

      setConfig(interaction.guildId, {
        erlc_key_encrypted: encryptSecret(serverKey)
      });

      return interaction.reply({
        content:
          `✅ ER:LC connection saved securely.\n` +
          `${result.message}\n\n` +
          `The key will never be displayed back in Discord.`,
        ephemeral: true
      });
    }

    /*
     * DISCONNECT
     */

    if (
      interaction.isButton() &&
      interaction.customId === 'disconnect:cancel'
    ) {
      return interaction.update({
        content:
          'Disconnect cancelled. Nothing was changed.',
        components: []
      });
    }

    if (
      interaction.isButton() &&
      interaction.customId === 'disconnect:continue'
    ) {
      return interaction.update(
        disconnectConfirm(true)
      );
    }

    if (
      interaction.isButton() &&
      interaction.customId === 'disconnect:execute'
    ) {
      await interaction.update({
        content:
          'Disconnecting session integration…\n' +
          '**Tickets will not be touched.**',
        components: []
      });

      /*
       * ==========================================
       * DISCONNECT SAFETY BOUNDARY
       * ==========================================
       *
       * ONLY session_* resources are queried.
       *
       * NEVER DELETE:
       *
       * - Tickets
       * - Ticket channels
       * - Ticket transcripts
       * - Ticket categories
       * - Roles
       * - Customer-created channels
       * - Unrelated server content
       */

      const resources = getResources(
        interaction.guildId,
        'session_'
      );

      for (const resource of resources) {
        const channel =
          await interaction.guild.channels
            .fetch(resource.channel_id)
            .catch(() => null);

        if (channel?.isTextBased()) {
          const message =
            await channel.messages
              .fetch(resource.message_id)
              .catch(() => null);

          if (message) {
            await message.delete().catch(() => {});
          }
        }

        removeResource(
          interaction.guildId,
          resource.resource_type,
          resource.message_id
        );
      }

      clearSessionConfig(interaction.guildId);

      return interaction.editReply(
        '# Thank You! 👋\n' +
        'Your server has been disconnected from the **Oversite Customs Bot**.\n\n' +
        'The ER:LC connection and session configuration were removed.\n' +
        '**Your tickets, ticket channels, transcripts, categories, roles, and unrelated server content were left untouched.**\n\n' +
        'Thank you for using the **Oversite Customs Server Starting Pack!**'
      );
    }
  } catch (error) {
    console.error('Interaction error:', error);

    const payload = {
      content:
        'Something went wrong while processing that action.',
      ephemeral: true
    };

    if (interaction.replied || interaction.deferred) {
      await interaction
        .followUp(payload)
        .catch(() => {});
    } else {
      await interaction
        .reply(payload)
        .catch(() => {});
    }
  }
});

/*
 * STARTUP
 */

try {
  await registerGlobalCommands();

  await client.login(
    process.env.DISCORD_TOKEN
  );
} catch (error) {
  console.error(
    'Oversite Customs failed to start:',
    error
  );

  process.exit(1);
}
