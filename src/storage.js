// Lightweight JSON-file "database". No external DB needed for a small/medium bot.
// If you outgrow this (thousands of servers, high write volume), swap this file
// for a real database (SQLite/Postgres) — every other file only calls these functions.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { guilds: {}, appeals: {} };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(raw || '{"guilds":{},"appeals":{}}');
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function ensureGuild(db, guildId) {
  if (!db.guilds[guildId]) {
    db.guilds[guildId] = {
      config: {
        modChannelId: null,   // where reports are posted
        logChannelId: null,   // where mod actions (warn/mute/kick/ban) are logged
        warnThreshold: 3,     // warnings before auto-ban
        backupGuildId: null,  // server to evacuate members into if this one is nuked
        antiNukeEnabled: true
      },
      warnings: {},        // userId -> array of { id, reason, moderatorId, timestamp }
      authorizedUsers: {}  // userId -> { accessToken, refreshToken, expiresAt }
    };
  }
  if (!db.guilds[guildId].config) {
    db.guilds[guildId].config = { modChannelId: null, logChannelId: null, warnThreshold: 3, backupGuildId: null, antiNukeEnabled: true };
  }
  if (db.guilds[guildId].config.backupGuildId === undefined) db.guilds[guildId].config.backupGuildId = null;
  if (db.guilds[guildId].config.antiNukeEnabled === undefined) db.guilds[guildId].config.antiNukeEnabled = true;
  if (!db.guilds[guildId].warnings) {
    db.guilds[guildId].warnings = {};
  }
  if (!db.guilds[guildId].authorizedUsers) {
    db.guilds[guildId].authorizedUsers = {};
  }
  return db.guilds[guildId];
}

// ---- Config ----

function getConfig(guildId) {
  const db = readDB();
  const guild = ensureGuild(db, guildId);
  return guild.config;
}

function setConfig(guildId, partialConfig) {
  const db = readDB();
  const guild = ensureGuild(db, guildId);
  guild.config = { ...guild.config, ...partialConfig };
  writeDB(db);
  return guild.config;
}

// ---- Warnings ----

function addWarning(guildId, userId, reason, moderatorId) {
  const db = readDB();
  const guild = ensureGuild(db, guildId);
  if (!guild.warnings[userId]) guild.warnings[userId] = [];
  const warning = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    reason,
    moderatorId,
    timestamp: new Date().toISOString()
  };
  guild.warnings[userId].push(warning);
  writeDB(db);
  return { warning, count: guild.warnings[userId].length, threshold: guild.config.warnThreshold };
}

function getWarnings(guildId, userId) {
  const db = readDB();
  const guild = ensureGuild(db, guildId);
  return guild.warnings[userId] || [];
}

function removeWarning(guildId, userId, warningId) {
  const db = readDB();
  const guild = ensureGuild(db, guildId);
  const list = guild.warnings[userId] || [];
  const idx = list.findIndex(w => w.id === warningId);
  if (idx === -1) return null;
  const [removed] = list.splice(idx, 1);
  writeDB(db);
  return removed;
}

function clearWarnings(guildId, userId) {
  const db = readDB();
  const guild = ensureGuild(db, guildId);
  const count = (guild.warnings[userId] || []).length;
  guild.warnings[userId] = [];
  writeDB(db);
  return count;
}

// ---- Appeals ----

function createAppeal(guildId, userId, banReason, appealText) {
  const db = readDB();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  db.appeals[id] = {
    id,
    guildId,
    userId,
    banReason,
    appealText,
    status: 'pending', // pending | approved | denied
    timestamp: new Date().toISOString()
  };
  writeDB(db);
  return db.appeals[id];
}

function getAppeal(appealId) {
  const db = readDB();
  return db.appeals[appealId] || null;
}

function setAppealStatus(appealId, status) {
  const db = readDB();
  if (!db.appeals[appealId]) return null;
  db.appeals[appealId].status = status;
  writeDB(db);
  return db.appeals[appealId];
}

// ---- Authorized users (for backup/evacuation) ----

function saveAuthorizedUser(guildId, userId, tokenData) {
  const db = readDB();
  const guild = ensureGuild(db, guildId);
  guild.authorizedUsers[userId] = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000
  };
  writeDB(db);
}

function getAuthorizedUsers(guildId) {
  const db = readDB();
  const guild = ensureGuild(db, guildId);
  return guild.authorizedUsers;
}

function updateAuthorizedUserToken(guildId, userId, tokenData) {
  const db = readDB();
  const guild = ensureGuild(db, guildId);
  if (!guild.authorizedUsers[userId]) return;
  guild.authorizedUsers[userId].accessToken = tokenData.access_token;
  guild.authorizedUsers[userId].refreshToken = tokenData.refresh_token;
  guild.authorizedUsers[userId].expiresAt = Date.now() + tokenData.expires_in * 1000;
  writeDB(db);
}

module.exports = {
  getConfig,
  setConfig,
  addWarning,
  getWarnings,
  removeWarning,
  clearWarnings,
  createAppeal,
  getAppeal,
  setAppealStatus,
  saveAuthorizedUser,
  getAuthorizedUsers,
  updateAuthorizedUserToken
};
