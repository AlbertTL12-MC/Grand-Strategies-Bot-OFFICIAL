# GS Bot

A Discord moderation bot with warnings (auto-ban at a threshold), private reports,
DM-only ban appeals, mod-action logging, and an emergency "evacuation" system that
moves authorized members to a backup server if your main server is nuked.

## Features

- **`/warn @user reason`** — adds a warning. At the configured threshold (default 3),
  the member is automatically banned. Before banning, the bot DMs them ban info and
  an **appeal button** — appeals can only be submitted through that DM.
- **`/warnings @user`**, **`/unwarn @user warning_id`**, **`/clearwarnings @user`** —
  manage warnings.
- **`/report @user reason`** — any member can privately report someone. It's posted
  only to your configured mod channel, with Warn / Ban / Dismiss buttons for staff.
- **Appeals** — banned users get a DM with a "Submit Appeal" button, which opens a
  form. Their appeal is posted to the mod channel with Approve (auto-unban) / Deny
  buttons, and they get DMed the decision.
- **Logs** — every mod action (warn, auto-ban, ban via report, unban via appeal) is
  posted to your configured log channel.
- **`/setup`** — configure the mod channel, log channel, and warn threshold.
- **Backup/evacuation system:**
  - **`/setbackup backup_guild_id`** (admin) — sets which server to evacuate members
    into. The bot must already be a member of that server.
  - **`/authorize`** (any member) — gives the member a link to grant the bot
    permission (Discord's official `guilds.join` OAuth scope) to add them to the
    backup server if needed. Nothing else is authorized.
  - **`/evacuate`** (admin) — immediately adds every authorized member into the
    backup server.
  - **Automatic anti-nuke detection** — if 3+ destructive actions (channel deletions,
    role deletions, bans) happen within 10 seconds, the bot posts an alert to your
    log channel and automatically triggers evacuation if a backup server is set.
    This is a basic tripwire, not a replacement for Discord's own audit logs, 2FA
    requirement for moderation, and tightly restricted admin roles.

## Setup

### 1. Create the bot application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application**.
2. **Bot** tab → click **Reset Token** → copy it (this is your `DISCORD_TOKEN`). Keep it secret.
3. Still on the **Bot** tab, enable the **Server Members Intent** (required for warnings/bans to work reliably).
4. **OAuth2** tab → copy the **Client ID** (`CLIENT_ID`) and **Client Secret** (`CLIENT_SECRET`) — you only need the secret if you're using the backup/evacuation feature.
5. **OAuth2 → URL Generator**: check `bot` and `applications.commands`, then under Bot Permissions check at least: Ban Members, Moderate Members, Manage Roles (if you'll use it for anti-nuke), Send Messages, Create Invite, View Channels. Use the generated URL to invite the bot to your main server **and** your backup server.

### 2. Install and configure

```bash
npm install
cp .env.example .env
```

Fill in `.env`:
- `DISCORD_TOKEN`, `CLIENT_ID` — required.
- `GUILD_ID` — optional, put your test server's ID here while developing so slash
  commands update instantly instead of waiting up to an hour.
- `CLIENT_SECRET`, `PUBLIC_URL`, `PORT` — only needed if you want the backup/evacuation
  feature. `PUBLIC_URL` must be a real public HTTPS URL from your host (see hosting
  section below), and you must add `<PUBLIC_URL>/oauth/callback` as a Redirect URI
  in the Developer Portal's OAuth2 tab.

### 3. Deploy slash commands and run

```bash
npm run deploy   # registers /warn, /report, /setup, etc. with Discord
npm start        # starts the bot
```

## Hosting

This bot needs to run 24/7. A couple of honest notes on hosting:

- **If you're only using moderation features (no backup/evacuation)**, you don't
  need a public web server at all — any always-on Node host works, including a
  bare VPS with `pm2` keeping the process alive.
- **If you're using `/authorize` and evacuation**, you need a host that gives you a
  real public HTTPS URL for the OAuth redirect (this rules out purely local
  testing).
- There's no hosting option that's simultaneously unlimited, permanently free, and
  never sleeps/restarts — that combination isn't really offered as a sustainable
  product. The closest real option is **Oracle Cloud's Always Free tier**, which
  gives you an actual always-on ARM VM (not a spun-down container) for free
  indefinitely — you manage it like a normal Linux server (SSH in, use `pm2` or a
  `systemd` service to keep the bot running and auto-restart on crash/reboot).
  Sign-up approval for new Oracle accounts can be inconsistent. If you'd rather not
  manage a server yourself, Railway/Render's cheapest paid tier (~$5/mo) is the
  simplest path to a bot that's always on with zero server administration.

## Data storage

Warnings, appeals, config, and authorization tokens are stored in `data/db.json` —
a plain JSON file, which is fine for small-to-medium servers. Back this file up
periodically. If you outgrow it, swap `src/storage.js` for a real database; every
other file only calls its exported functions, so nothing else needs to change.

## Security notes

- `.env` and `data/db.json` contain secrets (bot token, OAuth tokens) — never commit
  them to a public repo. A `.gitignore` is included.
- The `/authorize` OAuth scope is limited to `identify guilds.join` — it lets the
  bot add that specific member to the backup server and nothing more. It cannot
  read their messages, DMs, or take any other action on their account.
- Restrict who can use `/setup`, `/setbackup`, and `/evacuate` — the default
  permission requirements (Manage Server / Administrator) already limit these, but
  double-check your server's role permissions match who you actually trust.
