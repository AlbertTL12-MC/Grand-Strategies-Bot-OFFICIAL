const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setranklogs')
    .setDescription('Set the promotion/demotion log channels by pasting their IDs')
    .addStringOption(opt => opt.setName('promotion_channel_id').setDescription('Channel ID for promotion logs'))
    .addStringOption(opt => opt.setName('demotion_channel_id').setDescription('Channel ID for demotion logs'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const promotionId = interaction.options.getString('promotion_channel_id');
    const demotionId = interaction.options.getString('demotion_channel_id');

    if (!promotionId && !demotionId) {
      return interaction.reply({ content: 'Provide at least one of `promotion_channel_id` or `demotion_channel_id`.', ephemeral: true });
    }

    const update = {};
    const results = [];

    if (promotionId) {
      const channel = await interaction.guild.channels.fetch(promotionId).catch(() => null);
      if (!channel) {
        return interaction.reply({ content: `Couldn't find a channel with ID \`${promotionId}\` in this server. Double check the ID.`, ephemeral: true });
      }
      update.promotionLogChannelId = channel.id;
      results.push(`Promotion logs → <#${channel.id}>`);
    }

    if (demotionId) {
      const channel = await interaction.guild.channels.fetch(demotionId).catch(() => null);
      if (!channel) {
        return interaction.reply({ content: `Couldn't find a channel with ID \`${demotionId}\` in this server. Double check the ID.`, ephemeral: true });
      }
      update.demotionLogChannelId = channel.id;
      results.push(`Demotion logs → <#${channel.id}>`);
    }

    storage.setConfig(interaction.guild.id, update);
    return interaction.reply({ content: `Updated:\n${results.join('\n')}`, ephemeral: true });
  }
};
