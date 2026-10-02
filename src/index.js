import 'dotenv/config';
import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, Events, GatewayIntentBits,
  ModalBuilder, TextInputBuilder, TextInputStyle
} from 'discord.js';
import * as setup from './commands/setup.js';
import * as session from './commands/session.js';
import * as disconnect from './commands/disconnect.js';
import { clearSessionConfig, getResources, removeResource, setConfig } from './db.js';
import { encryptSecret } from './lib/crypto.js';
import { validateErlcKey } from './lib/erlc.js';
import { disconnectConfirm, sessionSetupView, setupView, ticketSetupView } from './ui.js';

if (!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN is missing.');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const commands = new Map([
  ['setup', setup],
  ['session', session],
  ['disconnect', disconnect]
]);

client.once(Events.ClientReady, c => console.log(`Oversite Customs online as ${c.user.tag}`));

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const cmd = commands.get(interaction.commandName);
      if (cmd) await cmd.execute(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'setup:section') {
      const section = interaction.values[0];

      if (section === 'erlc') {
        const modal = new ModalBuilder().setCustomId('setup:erlc_modal').setTitle('Connect ER:LC Server');
        const key = new TextInputBuilder()
          .setCustomId('server_key')
          .setLabel('ER:LC Server API Key')
          .setPlaceholder('Paste the key here')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(key));
        await interaction.showModal(modal);
        return;
      }

      if (section === 'sessions') return interaction.update(sessionSetupView());
      if (section === 'tickets') return interaction.update(ticketSetupView());
      if (section === 'branding') {
        return interaction.update({ content: '**Branding editor is next on the build list.**', components: [] });
      }
    }

    if (interaction.isChannelSelectMenu()) {
      const map = {
        'setup:session_channel': 'session_channel_id',
        'setup:ticket_panel': 'ticket_panel_channel_id',
        'setup:ticket_category': 'ticket_category_id',
        'setup:ticket_logs': 'ticket_log_channel_id'
      };
      if (map[interaction.customId]) {
        setConfig(interaction.guildId, { [map[interaction.customId]]: interaction.values[0] });
        return interaction.reply({ content: 'Saved.', ephemeral: true });
      }
    }

    if (interaction.isRoleSelectMenu()) {
      const map = {
        'setup:session_role': 'session_ping_role_id',
        'setup:ticket_role': 'ticket_support_role_id'
      };
      if (map[interaction.customId]) {
        setConfig(interaction.guildId, { [map[interaction.customId]]: interaction.values[0] });
        return interaction.reply({ content: 'Saved.', ephemeral: true });
      }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'setup:erlc_modal') {
      const serverKey = interaction.fields.getTextInputValue('server_key').trim();
      const result = await validateErlcKey(serverKey);
      if (!result.ok) return interaction.reply({ content: `❌ ${result.message}`, ephemeral: true });

      setConfig(interaction.guildId, { erlc_key_encrypted: encryptSecret(serverKey) });
      return interaction.reply({
        content: `✅ ER:LC connection saved securely.\n${result.message}\n\nThe key will never be displayed back in Discord.`,
        ephemeral: true
      });
    }

    if (interaction.isButton() && interaction.customId === 'disconnect:cancel') {
      return interaction.update({ content: 'Disconnect cancelled. Nothing was changed.', components: [] });
    }

    if (interaction.isButton() && interaction.customId === 'disconnect:continue') {
      return interaction.update(disconnectConfirm(true));
    }

    if (interaction.isButton() && interaction.customId === 'disconnect:execute') {
      await interaction.update({
        content: 'Disconnecting session integration…\n**Tickets will not be touched.**',
        components: []
      });

      // SAFETY BOUNDARY:
      // We query ONLY resource_type=session_*.
      // There is no ticket deletion code in this path.
      const resources = getResources(interaction.guildId, 'session_');
      for (const resource of resources) {
        const channel = await interaction.guild.channels.fetch(resource.channel_id).catch(() => null);
        if (channel?.isTextBased()) {
          const message = await channel.messages.fetch(resource.message_id).catch(() => null);
          if (message) await message.delete().catch(() => {});
        }
        removeResource(interaction.guildId, resource.resource_type, resource.message_id);
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
    const payload = { content: 'Something went wrong while processing that action.', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
});

client.login(process.env.DISCORD_TOKEN);
