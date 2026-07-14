const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('authorize')
    .setDescription('Authorize GS Bot to add you to the backup server if this server is ever nuked'),

  async execute(interaction) {
    if (!process.env.PUBLIC_URL || !process.env.CLIENT_SECRET) {
      return interaction.reply({ content: 'The backup/evacuation feature is not configured on this bot yet. Ask an admin.', ephemeral: true });
    }

    const state = `${interaction.guild.id}:${interaction.user.id}`;
    const params = new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      redirect_uri: `${process.env.PUBLIC_URL}/oauth/callback`,
      response_type: 'code',
      scope: 'identify guilds.join',
      state
    });
    const url = `https://discord.com/api/oauth2/authorize?${params.toString()}`;

    return interaction.reply({
      content: `Click below to authorize. This only grants permission to add you to the pre-configured backup server — nothing else.\n${url}`,
      ephemeral: true
    });
  }
};
