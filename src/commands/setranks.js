const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../storage');

// Builds a command with rank_1 (lowest) through rank_10 (highest) role options.
const builder = new SlashCommandBuilder()
  .setName('setranks')
  .setDescription('Define the rank ladder for /promote and /demote, from lowest to highest')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

for (let i = 1; i <= 10; i++) {
  builder.addRoleOption(opt =>
    opt.setName(`rank_${i}`)
      .setDescription(`Rank ${i}${i === 1 ? ' (lowest)' : ''}`)
      .setRequired(i === 1)
  );
}

module.exports = {
  data: builder,

  async execute(interaction) {
    const ladder = [];
    for (let i = 1; i <= 10; i++) {
      const role = interaction.options.getRole(`rank_${i}`);
      if (role) ladder.push(role.id);
      else break; // stop at the first gap so ordering stays unambiguous
    }

    if (ladder.length === 0) {
      return interaction.reply({ content: 'You need to provide at least `rank_1`.', ephemeral: true });
    }

    storage.setConfig(interaction.guild.id, { rankLadder: ladder });

    const list = ladder.map((id, i) => `${i + 1}. <@&${id}>`).join('\n');
    return interaction.reply({ content: `Rank ladder set (lowest to highest):\n${list}`, ephemeral: true });
  }
};
