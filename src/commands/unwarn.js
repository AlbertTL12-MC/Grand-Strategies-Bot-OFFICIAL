const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const storage = require('../storage');
const { logAction } = require('../utils/log');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Remove one warning from a member by its ID (see /warnings).')
    .addUserOption(opt => opt.setName('user').setDescription('The member').setRequired(true))
    .addStringOption(opt => opt.setName('warning_id').setDescription('The warning ID to remove').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const warningId = interaction.options.getString('warning_id');
    const guild = interaction.guild;

    const removed = storage.removeWarning(guild.id, target.id, warningId);
    if (!removed) {
      return interaction.reply({ content: 'No warning found with that ID. Check `/warnings` for the correct ID.', ephemeral: true });
    }

    const config = storage.getConfig(guild.id);
    await logAction(guild, config, {
      action: 'Unwarn',
      target,
      moderator: interaction.user,
      reason: `Removed warning: "${removed.reason}"`
    });

    return interaction.reply({ content: `Removed warning \`${warningId}\` from ${target.tag}.`, ephemeral: true });
  }
};
