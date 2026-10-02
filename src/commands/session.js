import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { getConfig, setConfig, trackResource } from '../db.js';

export const data = new SlashCommandBuilder()
  .setName('session')
  .setDescription('Manage ER:LC sessions')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(s => s.setName('start').setDescription('Start a session'))
  .addSubcommand(s => s.setName('boost').setDescription('Boost the active session'))
  .addSubcommand(s => s.setName('full').setDescription('Mark the session full'))
  .addSubcommand(s => s.setName('end').setDescription('End the session'));

export async function execute(interaction) {
  const c = getConfig(interaction.guildId);
  if (!c.session_channel_id) return interaction.reply({ content: 'Configure a session channel with `/setup` first.', ephemeral: true });

  const channel = await interaction.guild.channels.fetch(c.session_channel_id).catch(() => null);
  if (!channel?.isTextBased()) return interaction.reply({ content: 'The configured session channel no longer exists.', ephemeral: true });

  const action = interaction.options.getSubcommand();
  const titles = { start: 'Session Startup', boost: 'Session Boost', full: 'Session Full', end: 'Session Ended' };
  const descriptions = {
    start: `A session has been started by ${interaction.user}!`,
    boost: `The current session needs a boost! Come join us in-game.`,
    full: `The session is currently full. Thanks for joining!`,
    end: `The session has ended. Thank you for playing!`
  };

  const embed = new EmbedBuilder().setTitle(titles[action]).setDescription(descriptions[action]).setColor(c.embed_color);
  const content = c.session_ping_role_id && action !== 'end' ? `<@&${c.session_ping_role_id}>` : undefined;
  const msg = await channel.send({ content, embeds: [embed] });

  // Only messages explicitly tracked as session resources can be removed by disconnect.
  trackResource(interaction.guildId, 'session_message', channel.id, msg.id);
  setConfig(interaction.guildId, { active_session: action === 'end' ? 0 : 1 });

  await interaction.reply({ content: `${titles[action]} sent to ${channel}.`, ephemeral: true });
}
