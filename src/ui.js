import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder,
  ChannelType, EmbedBuilder, RoleSelectMenuBuilder, StringSelectMenuBuilder
} from 'discord.js';
import { getConfig } from './db.js';

export function setupView(guildId) {
  const c = getConfig(guildId);
  const embed = new EmbedBuilder()
    .setTitle('Oversite Customs • Setup')
    .setDescription('Configure the Starting Pack bot without editing code.')
    .setColor(c.embed_color)
    .addFields(
      { name: '🎮 ER:LC', value: c.erlc_key_encrypted ? '🟢 Connected' : '🔴 Not connected', inline: true },
      { name: '📢 Sessions', value: c.session_channel_id ? `<#${c.session_channel_id}>` : 'Not configured', inline: true },
      { name: '🎫 Tickets', value: c.ticket_category_id ? 'Configured' : 'Not configured', inline: true },
    );

  const select = new StringSelectMenuBuilder()
    .setCustomId('setup:section')
    .setPlaceholder('Choose something to configure')
    .addOptions(
      { label: 'ER:LC Connection', value: 'erlc', emoji: '🎮' },
      { label: 'Sessions', value: 'sessions', emoji: '📢' },
      { label: 'Tickets', value: 'tickets', emoji: '🎫' },
      { label: 'Branding', value: 'branding', emoji: '🎨' },
    );

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] };
}

export function sessionSetupView() {
  const channel = new ChannelSelectMenuBuilder()
    .setCustomId('setup:session_channel')
    .setPlaceholder('Select the sessions channel')
    .setChannelTypes(ChannelType.GuildText);

  const role = new RoleSelectMenuBuilder()
    .setCustomId('setup:session_role')
    .setPlaceholder('Select the session ping role');

  return {
    content: '**Session Setup**\nChoose the channel and ping role. These selectors save automatically.',
    components: [
      new ActionRowBuilder().addComponents(channel),
      new ActionRowBuilder().addComponents(role)
    ]
  };
}

export function ticketSetupView() {
  const panel = new ChannelSelectMenuBuilder()
    .setCustomId('setup:ticket_panel')
    .setPlaceholder('Select ticket panel channel')
    .setChannelTypes(ChannelType.GuildText);
  const category = new ChannelSelectMenuBuilder()
    .setCustomId('setup:ticket_category')
    .setPlaceholder('Select ticket category')
    .setChannelTypes(ChannelType.GuildCategory);
  const logs = new ChannelSelectMenuBuilder()
    .setCustomId('setup:ticket_logs')
    .setPlaceholder('Select ticket log channel')
    .setChannelTypes(ChannelType.GuildText);
  const role = new RoleSelectMenuBuilder()
    .setCustomId('setup:ticket_role')
    .setPlaceholder('Select support role');

  return {
    content: '**Ticket Setup**\nNothing here will ever make `/disconnect` delete actual tickets.',
    components: [
      new ActionRowBuilder().addComponents(panel),
      new ActionRowBuilder().addComponents(category),
      new ActionRowBuilder().addComponents(role),
      new ActionRowBuilder().addComponents(logs)
    ]
  };
}

export function disconnectConfirm(final = false) {
  const cancel = new ButtonBuilder().setCustomId('disconnect:cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary);
  const go = new ButtonBuilder()
    .setCustomId(final ? 'disconnect:execute' : 'disconnect:continue')
    .setLabel(final ? 'Disconnect' : 'Continue')
    .setStyle(ButtonStyle.Danger);

  return {
    content: final
      ? '**Final confirmation**\nThis removes the ER:LC connection and tracked **session messages/config only**.\n\n**Tickets, ticket channels, transcripts, categories, roles, and unrelated channels will NOT be deleted.**'
      : '**⚠️ Disconnect Oversite Bot?**\nThis will end the active session, clear the stored ER:LC key, clear session configuration, and remove bot-created session panels/messages.\n\n**It will NEVER delete actual tickets.**',
    components: [new ActionRowBuilder().addComponents(cancel, go)]
  };
}
