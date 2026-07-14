const storage = require('../storage');
const { addUserToGuild, refreshToken } = require('../oauth');

// Adds every authorized user for `sourceGuildId` into that guild's configured
// backup server. Returns a summary so a command or the anti-nuke handler can
// report back what happened.
async function evacuateGuild(client, sourceGuildId) {
  const config = storage.getConfig(sourceGuildId);
  if (!config.backupGuildId) {
    return { ok: false, reason: 'No backup server is configured. Use /setbackup first.' };
  }

  const authorizedUsers = storage.getAuthorizedUsers(sourceGuildId);
  const userIds = Object.keys(authorizedUsers);
  if (userIds.length === 0) {
    return { ok: false, reason: 'No members have authorized the bot yet (they need to run /authorize).' };
  }

  let added = 0;
  let failed = 0;
  const failures = [];

  for (const userId of userIds) {
    let entry = authorizedUsers[userId];
    try {
      // Refresh the token first if it's expired or close to expiring
      if (Date.now() > entry.expiresAt - 60_000) {
        const refreshed = await refreshToken(entry.refreshToken);
        storage.updateAuthorizedUserToken(sourceGuildId, userId, refreshed);
        entry = { ...entry, accessToken: refreshed.access_token };
      }

      const result = await addUserToGuild(client.token, config.backupGuildId, userId, entry.accessToken);
      if (result.success) {
        added++;
      } else {
        failed++;
        failures.push(`${userId}: ${result.error}`);
      }
    } catch (err) {
      failed++;
      failures.push(`${userId}: ${err.message}`);
    }
  }

  return { ok: true, added, failed, total: userIds.length, failures };
}

module.exports = { evacuateGuild };
