require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { startOAuthServer } = require('./oauthServer');
const { registerAntiNuke } = require('./handlers/antiNuke');
const { handleButton, handleModal } = require('./handlers/interactions');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.Message] // needed to receive DMs reliably
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`GS Bot is online as ${client.user.tag}`);
  registerAntiNuke(client);

  // Only start the OAuth web server if the backup/evacuation feature is configured
  if (process.env.PUBLIC_URL && process.env.CLIENT_SECRET) {
    startOAuthServer();
  } else {
    console.log('PUBLIC_URL/CLIENT_SECRET not set — skipping OAuth server (backup/evacuation feature disabled).');
  }
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModal(interaction);
    }
  } catch (err) {
    console.error('Interaction error:', err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Something went wrong running that.', ephemeral: true }).catch(() => null);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
