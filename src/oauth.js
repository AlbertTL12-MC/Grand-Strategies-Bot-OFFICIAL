// Talks to Discord's OAuth2 endpoints. Node 18+ has global fetch built in.

async function exchangeCodeForToken(code) {
  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${process.env.PUBLIC_URL}/oauth/callback`
  });

  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function refreshToken(refresh_token) {
  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token
  });

  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }
  return res.json();
}

// Adds a user to a guild using their OAuth access token (requires the bot to
// already be a member of that guild with CREATE_INSTANT_INVITE permission).
async function addUserToGuild(botToken, guildId, userId, accessToken) {
  const res = await fetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ access_token: accessToken })
  });

  // 201 = added, 204 = user was already in the guild. Both are "success".
  if (res.status === 201 || res.status === 204) return { success: true };

  const text = await res.text();
  return { success: false, status: res.status, error: text };
}

module.exports = { exchangeCodeForToken, refreshToken, addUserToGuild };
