const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setbackup')
    .setDescription("Set this server's backup server (used to evacuate members if this server is nuked)")
    .addStringOption(opt => opt.setName('backup_guild_id').setDescription('The ID of the backup server. The bot must already be a member of it.').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const backupGuildId = interaction.options.getString('backup_guild_id');

    const backupGuild = interaction.client.guilds.cache.get(backupGuildId);
    if (!backupGuild) {
      return interaction.reply({
        content: "I'm not a member of a server with that ID. Invite this bot to the backup server first, then run this command again.",
        ephemeral: true
      });
    }

    const me = backupGuild.members.me;
    if (!me?.permissions.has('CreateInstantInvite')) {
      return interaction.reply({
        content: `I'm in **${backupGuild.name}**, but I need the "Create Invite" permission there to add evacuated members. Please grant it and try again.`,
        ephemeral: true
      });
    }

    storage.setConfig(interaction.guild.id, { backupGuildId });
    return interaction.reply({ content: `Backup server set to **${backupGuild.name}**. Members need to run \`/authorize\` before they can be auto-added there in an emergency.`, ephemeral: true });
  }
};
