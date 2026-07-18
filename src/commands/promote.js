const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../storage');
const { logAction, postRankChangeEmbed } = require('../utils/log');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promote')
    .setDescription("Move a member up one step on the server's rank ladder")
    .addUserOption(opt => opt.setName('user').setDescription('The member to promote').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the promotion').setRequired(true))
    .addAttachmentOption(opt => opt.setName('evidence').setDescription('Optional screenshot/log proving they earned it'))
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

    const nextIndex = currentIndex + 1;
    if (nextIndex >= ladder.length) {
      return interaction.reply({ content: `${target.tag} is already at the top rank.`, ephemeral: true });
    }

    const me = guild.members.me;
    const nextRole = await guild.roles.fetch(ladder[nextIndex]).catch(() => null);
    if (!nextRole) {
      return interaction.reply({ content: 'The next rank role no longer exists. Ask an admin to run `/setranks` again.', ephemeral: true });
    }
    if (me.roles.highest.position <= nextRole.position) {
      return interaction.reply({ content: `I can't assign **${nextRole.name}** — it's positioned above my own highest role. Move my role above it in Server Settings → Roles.`, ephemeral: true });
    }

    const oldRoleName = currentIndex >= 0
      ? (await guild.roles.fetch(ladder[currentIndex]).catch(() => null))?.name || 'Unranked'
      : 'Unranked';

    try {
      if (currentIndex >= 0) await member.roles.remove(ladder[currentIndex]);
      await member.roles.add(nextRole.id);
    } catch (err) {
      return interaction.reply({ content: `Couldn't update roles: ${err.message}`, ephemeral: true });
    }

    await logAction(guild, config, {
      action: 'Promote',
      target,
      moderator: interaction.user,
      reason: `Promoted to ${nextRole.name}. ${reason}`
    });

    await postRankChangeEmbed(guild, config, {
      type: 'promotion',
      target,
      moderator: interaction.user,
      oldRankName: oldRoleName,
      newRankName: nextRole.name,
      reason,
      evidence
    });

    await target.send(`You were promoted to **${nextRole.name}** in ${guild.name}.`).catch(() => null);

    return interaction.reply({ content: `${target.tag} promoted to **${nextRole.name}**.`, ephemeral: true });
  }
};
