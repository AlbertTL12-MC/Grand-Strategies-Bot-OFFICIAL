// Very simple anti-nuke heuristic: if too many destructive actions (channel/role
// deletions, bans) happen in a short window, alert staff immediately and
// auto-trigger the backup evacuation. This is a tripwire, not a full security
// system - pair it with Discord's built-in audit log alerts and 2FA requirement
// for moderation actions, and restrict dangerous permissions (Manage Server,
// Ban Members, Manage Channels) to as few trusted roles as possible.

const storage = require('../storage');
const { evacuateGuild } = require('./evacuate');

const WINDOW_MS = 10_000; // 10 second window
const THRESHOLD = 3;      // 3+ destructive actions in that window = suspected nuke

// guildId -> array of timestamps
const recentActions = new Map();

function recordAction(guildId) {
  const now = Date.now();
  const arr = (recentActions.get(guildId) || []).filter(t => now - t < WINDOW_MS);
  arr.push(now);
  recentActions.set(guildId, arr);
  return arr.length;
}

async function handlePotentialNuke(guild, triggerDescription) {
  const config = storage.getConfig(guild.id);
  if (config.antiNukeEnabled === false) return;

  const count = recordAction(guild.id);
  if (count < THRESHOLD) return;

  console.warn(`[ANTI-NUKE] Triggered in guild ${guild.id}: ${triggerDescription}`);

  // Alert staff in the log channel if one is configured
  if (config.logChannelId) {
    try {
      const channel = await guild.channels.fetch(config.logChannelId);
      if (channel) {
        await channel.send({
          content: `**POSSIBLE SERVER NUKE DETECTED**\nTrigger: ${triggerDescription}\n${config.backupGuildId ? 'Auto-evacuating authorized members to the backup server now.' : 'No backup server is configured (use /setbackup) - evacuation skipped.'}`
        });
      }
    } catch (err) {
      console.error('Failed to send anti-nuke alert:', err);
    }
  }

  if (config.backupGuildId) {
    evacuateGuild(guild.client, guild.id).catch(err => console.error('Auto-evacuation failed:', err));
  }
}

function registerAntiNuke(client) {
  client.on('channelDelete', channel => {
    if (channel.guild) handlePotentialNuke(channel.guild, `channel deleted (#${channel.name || channel.id})`);
  });

  client.on('roleDelete', role => {
    handlePotentialNuke(role.guild, `role deleted (${role.name})`);
  });

  client.on('guildBanAdd', ban => {
    handlePotentialNuke(ban.guild, `member banned (${ban.user?.tag || ban.user?.id})`);
  });
}

module.exports = { registerAntiNuke };
