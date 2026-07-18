const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const storage = require('../storage');
const { logAction } = require('../utils/log');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member. Auto-bans them once they hit the warning threshold.')
    .addUserOption(opt => opt.setName('user').setDescription('The member to warn').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Why are you warning them?').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const guild = interaction.guild;

    const member = await guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    }
    if (!member.moderatable) {
      return interaction.reply({ content: "I can't moderate that member (role hierarchy or permissions).", ephemeral: true });
    }

    const { count, threshold } = storage.addWarning(guild.id, target.id, reason, interaction.user.id);
    const config = storage.getConfig(guild.id);

    await target.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xF1C40F)
          .setTitle(`You were warned in ${guild.name}`)
          .addFields(
            { name: 'Reason', value: reason },
            { name: 'Warning count', value: `${count}/${threshold}` }
          )
      ]
    }).catch(() => null);

    await logAction(guild, config, {
      action: 'Warn',
      target,
      moderator: interaction.user,
      reason: `${reason} (warning ${count}/${threshold})`,
      category: 'warn'
    });

    if (count >= threshold) {
      const banReason = `Auto-ban: reached ${count}/${threshold} warnings. Last warning: ${reason}`;

      const dmResult = await target.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle(`You have been banned from ${guild.name}`)
            .setDescription(`Reason: ${banReason}\n\nIf you believe this was a mistake, you can submit an appeal below. **Appeals can only be submitted through this DM.**`)
        ],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`appeal_start_${guild.id}`)
              .setLabel('Submit Appeal')
              .setStyle(ButtonStyle.Primary)
          )
        ]
      }).then(() => true).catch(() => false);

      await member.ban({ reason: banReason }).catch(() => null);

      await logAction(guild, config, {
        action: 'Auto-Ban',
        target,
        moderator: interaction.client.user,
        reason: dmResult ? banReason : `${banReason}\n⚠️ Could not DM this user the appeal link (their DMs are likely closed).`,
        category: 'ban'
      });

      return interaction.reply({
        content: dmResult
          ? `⚠️ ${target.tag} reached ${count}/${threshold} warnings and has been **auto-banned**.`
          : `⚠️ ${target.tag} reached ${count}/${threshold} warnings and has been **auto-banned**, but I couldn't DM them the appeal link (their DMs are probably closed).`,
        ephemeral: true
      });
    }

    return interaction.reply({ content: `${target.tag} has been warned. (${count}/${threshold} warnings)`, ephemeral: true });
  }
};
