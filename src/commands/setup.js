const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const storage = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure GS Bot for this server')
    .addChannelOption(opt => opt.setName('mod_channel').setDescription('Private channel where reports get posted').addChannelTypes(ChannelType.GuildText))
    .addChannelOption(opt => opt.setName('log_channel').setDescription('Channel where mod actions (warn/ban/etc) get logged').addChannelTypes(ChannelType.GuildText))
    .addChannelOption(opt => opt.setName('promotion_log_channel').setDescription('Channel for promotion/demotion logs (defaults to log_channel if unset)').addChannelTypes(ChannelType.GuildText))
    .addIntegerOption(opt => opt.setName('warn_threshold').setDescription('Warnings before auto-ban (default 3)').setMinValue(1).setMaxValue(20))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const modChannel = interaction.options.getChannel('mod_channel');
    const logChannel = interaction.options.getChannel('log_channel');
    const promotionLogChannel = interaction.options.getChannel('promotion_log_channel');
    const threshold = interaction.options.getInteger('warn_threshold');

    const update = {};
    if (modChannel) update.modChannelId = modChannel.id;
    if (logChannel) update.logChannelId = logChannel.id;
    if (promotionLogChannel) update.promotionLogChannelId = promotionLogChannel.id;
    if (threshold) update.warnThreshold = threshold;

    if (Object.keys(update).length === 0) {
      const current = storage.getConfig(interaction.guild.id);
      return interaction.reply({
        content: [
          '**Current GS Bot config:**',
          `Mod/report channel: ${current.modChannelId ? `<#${current.modChannelId}>` : 'not set'}`,
          `Log channel: ${current.logChannelId ? `<#${current.logChannelId}>` : 'not set'}`,
          `Promotion/demotion log channel: ${current.promotionLogChannelId ? `<#${current.promotionLogChannelId}>` : '(using log channel)'}`,
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
      content: `Updated config:\nMod/report channel: ${newConfig.modChannelId ? `<#${newConfig.modChannelId}>` : 'not set'}\nLog channel: ${newConfig.logChannelId ? `<#${newConfig.logChannelId}>` : 'not set'}\nWarn threshold: ${newConfig.warnThreshold}`,
      ephemeral: true
    });
  }
};
