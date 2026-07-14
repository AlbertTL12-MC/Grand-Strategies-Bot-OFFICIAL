const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const storage = require('../storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription("View a member's warnings")
    .addUserOption(opt => opt.setName('user').setDescription('The member').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const list = storage.getWarnings(interaction.guild.id, target.id);

    if (list.length === 0) {
      return interaction.reply({ content: `${target.tag} has no warnings.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle(`Warnings for ${target.tag}`)
      .setDescription(
        list.map(w => `**ID:** \`${w.id}\`\n**Reason:** ${w.reason}\n**By:** <@${w.moderatorId}>\n**When:** ${new Date(w.timestamp).toLocaleString()}`).join('\n\n')
      );

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
