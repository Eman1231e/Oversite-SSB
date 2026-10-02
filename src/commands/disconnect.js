import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { disconnectConfirm } from '../ui.js';

export const data = new SlashCommandBuilder()
  .setName('disconnect')
  .setDescription('Safely disconnect the Oversite session integration')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  await interaction.reply({ ...disconnectConfirm(false), ephemeral: true });
}
