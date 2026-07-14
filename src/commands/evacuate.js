const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { evacuateGuild } = require('../handlers/evacuate');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('evacuate')
    .setDescription('Manually move all authorized members to the backup server right now')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const result = await evacuateGuild(interaction.client, interaction.guild.id);

    if (!result.ok) {
      return interaction.editReply(result.reason);
    }

    let msg = `Evacuation complete: ${result.added}/${result.total} members added to the backup server.`;
    if (result.failed > 0) {
      msg += `\n${result.failed} failed (their authorization may have expired — ask them to run /authorize again).`;
    }
    return interaction.editReply(msg);
  }
};
