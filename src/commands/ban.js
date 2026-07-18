const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const storage = require('../storage');
const { logAction } = require('../utils/log');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member through GS Bot (sends them the appeal DM first)')
    .addUserOption(opt => opt.setName('user').setDescription('The member to ban').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Why are you banning them?').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const guild = interaction.guild;
    const config = storage.getConfig(guild.id);

    const member = await guild.members.fetch(target.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: 'That user is not in this server.', ephemeral: true });
    }
    if (!member.bannable) {
      return interaction.reply({ content: "I can't ban that member (role hierarchy or missing permissions).", ephemeral: true });
    }

    // Send the appeal DM BEFORE banning - always run this through the bot
    // (not Discord's native ban menu) so this DM actually goes out.
    const dmResult = await target.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle(`You have been banned from ${guild.name}`)
          .setDescription(`Reason: ${reason}\n\nIf you believe this was a mistake, you can submit an appeal below. **Appeals can only be submitted through this DM.**`)
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

    await member.ban({ reason }).catch(() => null);

    await logAction(guild, config, {
      action: 'Ban',
      target,
      moderator: interaction.user,
      reason: dmResult ? reason : `${reason}\n⚠️ Could not DM this user the appeal link (their DMs are likely closed) — they have no way to appeal unless contacted another way.`,
      category: 'ban'
    });

    if (!dmResult) {
      return interaction.reply({
        content: `${target.tag} has been banned. ⚠️ I couldn't DM them the appeal link (their DMs are probably closed) — they won't know how to appeal unless you reach them another way.`,
        ephemeral: true
      });
    }

    return interaction.reply({ content: `${target.tag} has been banned and sent the appeal DM.`, ephemeral: true });
  }
};
