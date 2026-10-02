import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { setupView } from '../ui.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configure the Oversite Customs bot')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  await interaction.reply({ ...setupView(interaction.guildId), ephemeral: true });
}
