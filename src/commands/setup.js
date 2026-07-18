const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const storage = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure GS Bot for this server')
    .addChannelOption(opt => opt.setName('mod_channel').setDescription('Private channel where reports AND appeals get posted').addChannelTypes(ChannelType.GuildText))
    .addChannelOption(opt => opt.setName('log_channel').setDescription('General "Mod Actions" channel (unwarn, clear warnings, appeal denied, anti-nuke alerts) + fallback').addChannelTypes(ChannelType.GuildText))
    .addChannelOption(opt => opt.setName('warn_log_channel').setDescription('Channel for /warn logs (defaults to log_channel if unset)').addChannelTypes(ChannelType.GuildText))
    .addChannelOption(opt => opt.setName('ban_log_channel').setDescription('Channel for ban/auto-ban/unban logs (defaults to log_channel if unset)').addChannelTypes(ChannelType.GuildText))
    .addChannelOption(opt => opt.setName('promotion_log_channel').setDescription('Channel for promotion logs (defaults to log_channel if unset)').addChannelTypes(ChannelType.GuildText))
    .addChannelOption(opt => opt.setName('demotion_log_channel').setDescription('Channel for demotion logs (defaults to log_channel if unset)').addChannelTypes(ChannelType.GuildText))
    .addIntegerOption(opt => opt.setName('warn_threshold').setDescription('Warnings before auto-ban (default 3)').setMinValue(1).setMaxValue(20))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const modChannel = interaction.options.getChannel('mod_channel');
    const logChannel = interaction.options.getChannel('log_channel');
    const warnLogChannel = interaction.options.getChannel('warn_log_channel');
    const banLogChannel = interaction.options.getChannel('ban_log_channel');
    const promotionLogChannel = interaction.options.getChannel('promotion_log_channel');
    const demotionLogChannel = interaction.options.getChannel('demotion_log_channel');
    const threshold = interaction.options.getInteger('warn_threshold');

    const update = {};
    if (modChannel) update.modChannelId = modChannel.id;
    if (logChannel) update.logChannelId = logChannel.id;
    if (warnLogChannel) update.warnLogChannelId = warnLogChannel.id;
    if (banLogChannel) update.banLogChannelId = banLogChannel.id;
    if (promotionLogChannel) update.promotionLogChannelId = promotionLogChannel.id;
    if (demotionLogChannel) update.demotionLogChannelId = demotionLogChannel.id;
    if (threshold) update.warnThreshold = threshold;

    if (Object.keys(update).length === 0) {
      const current = storage.getConfig(interaction.guild.id);
      return interaction.reply({
        content: [
          '**Current GS Bot config:**',
          `Reports & appeals channel: ${current.modChannelId ? `<#${current.modChannelId}>` : 'not set'}`,
          `Mod Actions (general) channel: ${current.logChannelId ? `<#${current.logChannelId}>` : 'not set'}`,
          `Warn log channel: ${current.warnLogChannelId ? `<#${current.warnLogChannelId}>` : '(using Mod Actions channel)'}`,
          `Ban log channel: ${current.banLogChannelId ? `<#${current.banLogChannelId}>` : '(using Mod Actions channel)'}`,
          `Promotion log channel: ${current.promotionLogChannelId ? `<#${current.promotionLogChannelId}>` : '(using Mod Actions channel)'}`,
          `Demotion log channel: ${current.demotionLogChannelId ? `<#${current.demotionLogChannelId}>` : '(using Mod Actions channel)'}`,
          `Warn threshold: ${current.warnThreshold}`,
          `Backup server ID: ${current.backupGuildId || 'not set'}`,
          `Anti-nuke detection: ${current.antiNukeEnabled !== false ? 'enabled' : 'disabled'}`,
          `Rank ladder: ${current.rankLadder && current.rankLadder.length ? `${current.rankLadder.length} rank(s) set (use /setranks to view/edit)` : 'not set (use /setranks)'}`
        ].join('\n'),
        ephemeral: true
      });
    }

    const newConfig = storage.setConfig(interaction.guild.id, update);
    return interaction.reply({
      content: [
        'Updated config:',
        `Reports & appeals channel: ${newConfig.modChannelId ? `<#${newConfig.modChannelId}>` : 'not set'}`,
        `Mod Actions (general) channel: ${newConfig.logChannelId ? `<#${newConfig.logChannelId}>` : 'not set'}`,
        `Warn log channel: ${newConfig.warnLogChannelId ? `<#${newConfig.warnLogChannelId}>` : '(using Mod Actions channel)'}`,
        `Ban log channel: ${newConfig.banLogChannelId ? `<#${newConfig.banLogChannelId}>` : '(using Mod Actions channel)'}`,
        `Warn threshold: ${newConfig.warnThreshold}`
      ].join('\n'),
      ephemeral: true
    });
  }
};
