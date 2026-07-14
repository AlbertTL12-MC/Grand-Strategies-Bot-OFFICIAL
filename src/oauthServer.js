// Minimal web server just to catch Discord's OAuth2 redirect after a member
// clicks the /authorize link. It has no other routes and shows no sensitive data.

const express = require('express');
const { exchangeCodeForToken } = require('./oauth');
const storage = require('./storage');

function startOAuthServer() {
  const app = express();

  app.get('/oauth/callback', async (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).send('Authorization was cancelled or denied. You can close this tab.');
    }
    if (!code || !state) {
      return res.status(400).send('Missing code or state. You can close this tab and try /authorize again.');
    }

    // state was set to "<guildId>:<userId>" when we built the auth link
    const [guildId, userId] = state.split(':');
    if (!guildId || !userId) {
      return res.status(400).send('Invalid request. Please run /authorize again.');
    }

    try {
      const tokenData = await exchangeCodeForToken(code);
      storage.saveAuthorizedUser(guildId, userId, tokenData);
      res.send(`
        <html><body style="font-family: sans-serif; text-align:center; padding-top: 80px;">
          <h2>You're authorized</h2>
          <p>If this server is ever nuked, you'll be automatically added to the backup server. You can close this tab now.</p>
        </body></html>
      `);
    } catch (err) {
      console.error('OAuth callback error:', err);
      res.status(500).send('Something went wrong finishing authorization. Please try /authorize again.');
    }
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`OAuth callback server listening on port ${port}`);
  });
}

module.exports = { startOAuthServer };
