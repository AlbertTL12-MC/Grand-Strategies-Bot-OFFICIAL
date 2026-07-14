const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const storage = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Privately report a member to the staff team')
    .addUserOption(opt => opt.setName('user').setDescription('The member you are reporting').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('What happened?').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const guild = interaction.guild;
    const config = storage.getConfig(guild.id);

    if (!config.modChannelId) {
      return interaction.reply({ content: 'Reports are not set up yet. Ask an admin to run `/setup`.', ephemeral: true });
    }

    const channel = await guild.channels.fetch(config.modChannelId).catch(() => null);
    if (!channel) {
      return interaction.reply({ content: 'The configured mod channel no longer exists. Ask an admin to run `/setup` again.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xE67E22)
      .setTitle('New Report')
      .addFields(
        { name: 'Reported user', value: `${target.tag} (${target.id})`, inline: true },
        { name: 'Reported by', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`report_warn_${target.id}`).setLabel('Warn User').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`report_ban_${target.id}`).setLabel('Ban User').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`report_dismiss_${target.id}`).setLabel('Dismiss').setStyle(ButtonStyle.Success)
    );

    await channel.send({ embeds: [embed], components: [row] });

    return interaction.reply({ content: 'Thanks — your report has been sent to the staff team privately.', ephemeral: true });
  }
};
