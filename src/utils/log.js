const { EmbedBuilder } = require('discord.js');

async function logAction(guild, config, { action, target, moderator, reason }) {
  if (!config.logChannelId) return;
  const channel = await guild.channels.fetch(config.logChannelId).catch(() => null);
  if (!channel) return;

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`Mod Action: ${action}`)
        .addFields(
          { name: 'User', value: `${target.tag ?? target.username} (${target.id})`, inline: true },
          { name: 'Moderator', value: `${moderator.tag ?? moderator.username} (${moderator.id})`, inline: true },
          { name: 'Reason', value: reason || 'No reason given' }
        )
        .setTimestamp()
    ]
  }).catch(() => null);
}

// Posts a rich "Promotion Log" / "Demotion Log" embed, matching a staff-username /
// rank-change / reason / evidence layout.
async function postRankChangeEmbed(guild, config, { type, target, moderator, oldRankName, newRankName, reason, evidence }) {
  const isPromotion = type === 'promotion';
  const channelId = (isPromotion ? config.promotionLogChannelId : config.demotionLogChannelId) || config.logChannelId;
  if (!channelId) return;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(isPromotion ? 0x2ECC71 : 0xE74C3C)
    .setTitle(isPromotion ? 'Promotion Log' : 'Demotion Log')
    .setDescription(`${target.username} has been ${isPromotion ? 'promoted' : 'demoted'}!`)
    .setThumbnail(target.displayAvatarURL())
    .addFields(
      { name: 'Staff Username', value: moderator.username },
      { name: 'Rank Change', value: `${oldRankName} → ${newRankName}` },
      { name: 'Reason', value: reason || 'No reason given' }
    )
    .setTimestamp();

  const payload = { embeds: [embed] };

  if (evidence) {
    if (evidence.contentType?.startsWith('image/')) {
      embed.setImage(evidence.url);
    }
    embed.addFields({ name: 'Evidence', value: `[Attachment](${evidence.url})` });
  }

  await channel.send(payload).catch(() => null);
}

module.exports = { logAction, postRankChangeEmbed };
