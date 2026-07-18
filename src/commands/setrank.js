const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const storage = require('../storage');
const { logAction, postRankChangeEmbed } = require('../utils/log');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setrank')
    .setDescription('Set a member directly to a specific rank (jump up or down more than one step)')
    .addUserOption(opt => opt.setName('user').setDescription('The member').setRequired(true))
    .addRoleOption(opt => opt.setName('rank').setDescription('The exact rank to set them to (must be on the /setranks ladder)').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason for the change').setRequired(true))
    .addAttachmentOption(opt => opt.setName('evidence').setDescription('Optional screenshot/log backing the change'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const targetRole = interaction.options.getRole('rank');
    const reason = interaction.options.getString('reason');
    const evidence = interaction.options.getAttachment('evidence');
    const guild = interaction.guild;
    const config = storage.getConfig(guild.id);

    if (!config.rankLadder || config.rankLadder.length === 0) {
      return interaction.reply({ content: 'No rank ladder is set up yet. Ask an admin to run `/setranks` first.', ephemeral: true });
    }

    const ladder = config.rankLadder;
    const targetIndex = ladder.indexOf(targetRole.id);
    if (targetIndex === -1) {
      return interaction.reply({ content: `**${targetRole.name}** isn't part of the rank ladder. Run \`/setranks\` to include it, or pick a role that's already on the ladder.`, ephemeral: true });
    }

    const member = await guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    }

    let currentIndex = -1;
    for (let i = ladder.length - 1; i >= 0; i--) {
      if (member.roles.cache.has(ladder[i])) { currentIndex = i; break; }
    }

    if (currentIndex === targetIndex) {
      return interaction.reply({ content: `${target.tag} is already **${targetRole.name}**.`, ephemeral: true });
    }

    const me = guild.members.me;
    if (me.roles.highest.position <= targetRole.position) {
      return interaction.reply({ content: `I can't assign **${targetRole.name}** — it's positioned above my own highest role. Move my role above it in Server Settings → Roles.`, ephemeral: true });
    }

    const oldRoleName = currentIndex >= 0
      ? (await guild.roles.fetch(ladder[currentIndex]).catch(() => null))?.name || 'Unranked'
      : 'Unranked';

    try {
      // Remove any ladder roles they currently hold (normally just one, but clean up regardless)
      const rolesToRemove = ladder.filter(id => member.roles.cache.has(id));
      if (rolesToRemove.length > 0) await member.roles.remove(rolesToRemove);
      await member.roles.add(targetRole.id);
    } catch (err) {
      return interaction.reply({ content: `Couldn't update roles: ${err.message}`, ephemeral: true });
    }

    const isPromotion = targetIndex > currentIndex;

    await postRankChangeEmbed(guild, config, {
      type: isPromotion ? 'promotion' : 'demotion',
      target,
      moderator: interaction.user,
      oldRankName: oldRoleName,
      newRankName: targetRole.name,
      reason,
      evidence
    });

    await target.send(`Your rank in ${guild.name} was changed to **${targetRole.name}**.`).catch(() => null);

    return interaction.reply({ content: `${target.tag} set to **${targetRole.name}**.`, ephemeral: true });
  }
};
