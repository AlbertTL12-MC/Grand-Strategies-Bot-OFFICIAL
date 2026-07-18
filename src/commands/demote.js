const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../storage');
const { logAction, postRankChangeEmbed } = require('../utils/log');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('demote')
    .setDescription("Move a member down one step on the server's rank ladder")
    .addUserOption(opt => opt.setName('user').setDescription('The member to demote').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the demotion').setRequired(true))
    .addAttachmentOption(opt => opt.setName('evidence').setDescription('Optional screenshot/log backing the demotion'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const evidence = interaction.options.getAttachment('evidence');
    const guild = interaction.guild;
    const config = storage.getConfig(guild.id);

    if (!config.rankLadder || config.rankLadder.length === 0) {
      return interaction.reply({ content: 'No rank ladder is set up yet. Ask an admin to run `/setranks` first.', ephemeral: true });
    }

    const member = await guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    }

    const ladder = config.rankLadder;
    let currentIndex = -1;
    for (let i = ladder.length - 1; i >= 0; i--) {
      if (member.roles.cache.has(ladder[i])) { currentIndex = i; break; }
    }

    if (currentIndex === -1) {
      return interaction.reply({ content: `${target.tag} doesn't hold any rank on the ladder.`, ephemeral: true });
    }

    const me = guild.members.me;
    const currentRole = await guild.roles.fetch(ladder[currentIndex]).catch(() => null);
    if (currentRole && me.roles.highest.position <= currentRole.position) {
      return interaction.reply({ content: `I can't remove **${currentRole.name}** — it's positioned above my own highest role. Move my role above it in Server Settings → Roles.`, ephemeral: true });
    }

    const prevIndex = currentIndex - 1;
    let newRoleName = 'Unranked';

    try {
      await member.roles.remove(ladder[currentIndex]);
      if (prevIndex >= 0) {
        const prevRole = await guild.roles.fetch(ladder[prevIndex]).catch(() => null);
        if (prevRole) {
          await member.roles.add(prevRole.id);
          newRoleName = prevRole.name;
        }
      }
    } catch (err) {
      return interaction.reply({ content: `Couldn't update roles: ${err.message}`, ephemeral: true });
    }

    await postRankChangeEmbed(guild, config, {
      type: 'demotion',
      target,
      moderator: interaction.user,
      oldRankName: currentRole?.name || 'Unranked',
      newRankName: newRoleName,
      reason,
      evidence
    });

    await target.send(`You were demoted to **${newRoleName}** in ${guild.name}.`).catch(() => null);

    return interaction.reply({ content: `${target.tag} demoted to **${newRoleName}**.`, ephemeral: true });
  }
};
