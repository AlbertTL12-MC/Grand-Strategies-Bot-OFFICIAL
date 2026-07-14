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

module.exports = { logAction };
