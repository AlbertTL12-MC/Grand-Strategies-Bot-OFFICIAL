const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlogchannels')
    .setDescription('Set any log channel by pasting its ID (handy on mobile - no scrolling through a channel picker)')
    .addStringOption(opt => opt.setName('warn_channel_id').setDescription('Channel ID for /warn logs'))
    .addStringOption(opt => opt.setName('ban_channel_id').setDescription('Channel ID for ban/auto-ban/unban logs'))
    .addStringOption(opt => opt.setName('promotion_channel_id').setDescription('Channel ID for promotion logs'))
    .addStringOption(opt => opt.setName('demotion_channel_id').setDescription('Channel ID for demotion logs'))
    .addStringOption(opt => opt.setName('mod_channel_id').setDescription('Channel ID for reports & appeals'))
    .addStringOption(opt => opt.setName('general_channel_id').setDescription('Channel ID for the general "Mod Actions" catch-all channel'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const fields = {
      warn_channel_id: 'warnLogChannelId',
      ban_channel_id: 'banLogChannelId',
      promotion_channel_id: 'promotionLogChannelId',
      demotion_channel_id: 'demotionLogChannelId',
      mod_channel_id: 'modChannelId',
      general_channel_id: 'logChannelId'
    };

    const labels = {
      warn_channel_id: 'Warn logs',
      ban_channel_id: 'Ban logs',
      promotion_channel_id: 'Promotion logs',
      demotion_channel_id: 'Demotion logs',
      mod_channel_id: 'Reports & appeals',
      general_channel_id: 'Mod Actions (general)'
    };

    const update = {};
    const results = [];
    let provided = false;

    for (const [optionName, configKey] of Object.entries(fields)) {
      const id = interaction.options.getString(optionName);
      if (!id) continue;
      provided = true;

      const channel = await interaction.guild.channels.fetch(id).catch(() => null);
      if (!channel) {
        return interaction.reply({ content: `Couldn't find a channel with ID \`${id}\` in this server (checking \`${optionName}\`). Double check the ID.`, ephemeral: true });
      }
      update[configKey] = channel.id;
      results.push(`${labels[optionName]} → <#${channel.id}>`);
    }

    if (!provided) {
      return interaction.reply({ content: 'Provide at least one channel ID.', ephemeral: true });
    }

    storage.setConfig(interaction.guild.id, update);
    return interaction.reply({ content: `Updated:\n${results.join('\n')}`, ephemeral: true });
  }
};
