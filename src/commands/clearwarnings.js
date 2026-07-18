const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../storage');
const { logAction } = require('../utils/log');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarnings')
    .setDescription("Clear all of a member's warnings.")
    .addUserOption(opt => opt.setName('user').setDescription('The member').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const guild = interaction.guild;

    const count = storage.clearWarnings(guild.id, target.id);
    const config = storage.getConfig(guild.id);

    await logAction(guild, config, {
      action: 'Clear Warnings',
      target,
      moderator: interaction.user,
      reason: `Cleared ${count} warning(s)`,
      category: 'warn'
    });

    return interaction.reply({ content: `Cleared ${count} warning(s) for ${target.tag}.`, ephemeral: true });
  }
};
