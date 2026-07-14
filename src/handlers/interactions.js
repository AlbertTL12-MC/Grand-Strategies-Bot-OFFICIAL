const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const storage = require('../storage');
const { logAction } = require('../utils/log');

async function handleButton(interaction) {
  const { customId } = interaction;

  // --- Appeal: user clicked "Submit Appeal" in their ban DM ---
  if (customId.startsWith('appeal_start_')) {
    const guildId = customId.replace('appeal_start_', '');

    const modal = new ModalBuilder()
      .setCustomId(`appeal_modal_${guildId}`)
      .setTitle('Ban Appeal');

    const textInput = new TextInputBuilder()
      .setCustomId('appeal_text')
      .setLabel('Why should you be unbanned?')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(1000)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(textInput));
    return interaction.showModal(modal);
  }

  // --- Appeal decision buttons (posted in the mod channel) ---
  if (customId.startsWith('appeal_approve_') || customId.startsWith('appeal_deny_')) {
    const appealId = customId.split('_').pop();
    const appeal = storage.getAppeal(appealId);
    if (!appeal) {
      return interaction.reply({ content: 'This appeal no longer exists.', ephemeral: true });
    }

    const approve = customId.startsWith('appeal_approve_');
    storage.setAppealStatus(appealId, approve ? 'approved' : 'denied');

    const guild = interaction.client.guilds.cache.get(appeal.guildId);
    const config = guild ? storage.getConfig(guild.id) : null;

    if (approve && guild) {
      await guild.members.unban(appeal.userId, `Appeal approved by ${interaction.user.tag}`).catch(() => null);
    }

    const user = await interaction.client.users.fetch(appeal.userId).catch(() => null);
    if (user) {
      await user.send(
        approve
          ? `Your appeal for **${guild?.name || 'the server'}** was **approved**. You've been unbanned.`
          : `Your appeal for **${guild?.name || 'the server'}** was **denied**.`
      ).catch(() => null);
    }

    if (guild && config) {
      await logAction(guild, config, {
        action: approve ? 'Appeal Approved (Unban)' : 'Appeal Denied',
        target: user || { id: appeal.userId, tag: appeal.userId },
        moderator: interaction.user,
        reason: approve ? 'Appeal approved' : 'Appeal denied'
      });
    }

    await interaction.update({
      content: `${interaction.message.content}\n\n**${approve ? 'Approved' : 'Denied'}** by ${interaction.user.tag}`,
      components: []
    });
    return;
  }

  // --- Report action buttons (posted in the mod channel by /report) ---
  if (customId.startsWith('report_warn_') || customId.startsWith('report_ban_') || customId.startsWith('report_dismiss_')) {
    const targetId = customId.split('_').pop();
    const guild = interaction.guild;
    const config = storage.getConfig(guild.id);

    if (customId.startsWith('report_dismiss_')) {
      await interaction.update({ content: `${interaction.message.content}\n\n**Dismissed** by ${interaction.user.tag}`, components: [] });
      return;
    }

    const member = await guild.members.fetch(targetId).catch(() => null);
    if (!member) {
      return interaction.reply({ content: 'That member is no longer in the server.', ephemeral: true });
    }

    if (customId.startsWith('report_warn_')) {
      const { count, threshold } = storage.addWarning(guild.id, targetId, 'Warned via report', interaction.user.id);
      await member.send(`You were warned in ${guild.name} following a report. (${count}/${threshold} warnings)`).catch(() => null);
      await logAction(guild, config, { action: 'Warn (via report)', target: member.user, moderator: interaction.user, reason: `Warning ${count}/${threshold}` });
      await interaction.update({ content: `${interaction.message.content}\n\n**Warned** by ${interaction.user.tag}`, components: [] });
      return;
    }

    if (customId.startsWith('report_ban_')) {
      await member.send({
        embeds: [new EmbedBuilder().setColor(0xE74C3C).setTitle(`You have been banned from ${guild.name}`).setDescription('If you believe this was a mistake, you can submit an appeal below. **Appeals can only be submitted through this DM.**')],
        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`appeal_start_${guild.id}`).setLabel('Submit Appeal').setStyle(ButtonStyle.Primary))]
      }).catch(() => null);
      await member.ban({ reason: `Banned via report by ${interaction.user.tag}` }).catch(() => null);
      await logAction(guild, config, { action: 'Ban (via report)', target: member.user, moderator: interaction.user, reason: 'Banned via report action' });
      await interaction.update({ content: `${interaction.message.content}\n\n**Banned** by ${interaction.user.tag}`, components: [] });
      return;
    }
  }
}

async function handleModal(interaction) {
  if (interaction.customId.startsWith('appeal_modal_')) {
    const guildId = interaction.customId.replace('appeal_modal_', '');
    const appealText = interaction.fields.getTextInputValue('appeal_text');

    const guild = interaction.client.guilds.cache.get(guildId);
    const config = guild ? storage.getConfig(guildId) : null;

    const appeal = storage.createAppeal(guildId, interaction.user.id, 'N/A', appealText);

    if (guild && config?.modChannelId) {
      const channel = await guild.channels.fetch(config.modChannelId).catch(() => null);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(0x9B59B6)
          .setTitle('New Ban Appeal')
          .addFields(
            { name: 'User', value: `${interaction.user.tag} (${interaction.user.id})` },
            { name: 'Appeal', value: appealText }
          )
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`appeal_approve_${appeal.id}`).setLabel('Approve & Unban').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`appeal_deny_${appeal.id}`).setLabel('Deny').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ embeds: [embed], components: [row] });
      }
    }

    return interaction.reply({ content: 'Your appeal has been submitted to the staff team. You will be DMed with their decision.', ephemeral: true });
  }
}

module.exports = { handleButton, handleModal };
