const { Client, GatewayIntentBits, Collection, Events, AuditLogEvent, Message, EmbedBuilder, ClientPresence, Webhook, Guild, PermissionFlagsBits, PermissionsBitField, ActivityType } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { joinVoiceChannel } = require('@discordjs/voice');
const { Routes } = require('discord-api-types/v9');
const chalk = require('chalk');
require('dotenv').config();
const cliProgress = require('cli-progress');
const fs = require('fs');
const fetch = require('node-fetch');

token = process.env.TOKEN;
appid = process.env.APPID;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const ServerCheck = 'https://pancakesmp.ddns.net';

let statusNote = 'Currently still empty, waiting for changes...';
let statusMessage = null;
let lastStatus = null;
let lastUpdateTime = null;

const bar1 = new cliProgress.SingleBar({
  format: '[{bar}] {percentage}% | {prefix} {message}',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true,
  stream: process.stdout,
  fps: 60,
  stopOnComplete: true,
  clearOnComplete: false,
  formatValue: (value, _, type) => {
    if (type === 'message') {
      return chalk.hex('#6a0dad')(value);
    }
    return value;
  },
}, cliProgress.Presets.shades_classic);

bar1.start(500, 0, {
  prefix: chalk.hex('#6a0dad')('[App]'),
  message: 'Starting...',
});

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] });
client.commands = new Collection();

function makeid(length) {
  let result = '';
  const characters = 'xyzXYZ0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

function getCurrentTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function getCurrentDate() {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear().toString();
  return `${day}-${month}-${year}`;
}

const currentDate = getCurrentDate();
console.log(currentDate);

const fslogger = fs.createWriteStream('./event.log.' + getCurrentDate(), { flags: 'w' });

function log(event) {
  console.log(chalk.magenta('[APP]: ') + chalk.gray(event));
  fslogger.write('[APP, { ' + getCurrentTime() + ' }]: ' + event);
}

const commands = [
  {
    name: 'ping',
    description: 'Replies with the bot and api ping!'
  },
  {
    name: 'statusnote',
    description: 'Set the note in the server status embed.',
    options: [
      {
        name: 'preset',
        description: 'Choose a preset note.',
        type: 3,
        required: false,
        choices: [
          { name: 'Currently in update mode', value: 'Currently in update mode' },
          { name: 'Back up from update mode', value: 'Back up from update mode' }
        ]
      },
      {
        name: 'custom',
        description: 'Enter a custom note.',
        type: 3,
        required: false
      }
    ],
    Permissions: 'ADMINISTRATOR'
  }
];

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
  try {
    bar1.update(100, {
      message: 'Refreshing application (/) commands...',
    });
    await rest.put(
      Routes.applicationCommands(appid),
      { body: commands },
    );
    bar1.update(100, {
      message: 'Successfully reloaded application (/) commands.',
    });
  } catch (error) {
    console.error(error);
  }
})();

async function cleanStatusChannel(channel, keepMessage) {
  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const toDelete = messages.filter(m => m.id !== keepMessage.id);
    if (toDelete.size > 0) {
      await channel.bulkDelete(toDelete, true);
    }
  } catch (err) {
    console.error('Error cleaning status channel:', err);
  }
}

function getTime24h(date = new Date()) {
  return date.toLocaleTimeString('en-GB', { hour12: false });
}

function getNextUpdateTime() {
  const updateInterval = 30 * 1000;
  const now = new Date(Date.now() + updateInterval);
  return now.toLocaleTimeString('en-GB', { hour12: false });
}

async function checkServerStatus() {
  try {
    const res = await fetch(ServerCheck, { method: 'GET', timeout: 5000 });
    return res.ok;
  } catch (e) {
    return false;
  }
}

function buildStatusEmbed(isOnline) {
  return new EmbedBuilder()
    .setColor(isOnline ? 0x57F287 : 0xED4245)
    .setTitle('Server Status')
    .setDescription(isOnline
      ? `The server ${ServerCheck.replace(/^https?:\/\//, '')} is **online**! ✅`
      : `The server ${ServerCheck.replace(/^https?:\/\//, '')} is **offline**! ❌`)
    .addFields(
      { name: 'Note', value: statusNote || '‎', inline: false },
      { name: 'Updating all', value: '30 seconds', inline: true },
      { name: 'Last updated', value: lastUpdateTime ? getTime24h(lastUpdateTime) : getTime24h(), inline: true },
      { name: 'Next update at', value: getNextUpdateTime(), inline: true }
    )
    // .setFooter({ text: 'Made by bananenmann187' })
    .setTimestamp();
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  bar1.update(300, {
    message: 'Setting activity...',
  });
  client.user.setActivity(`Checking ${ServerCheck.replace(/^https?:\/\//, '')}`, { type: ActivityType.Custom });
  client.user.setStatus('idle');
  console.clear();
  bar1.update(400, {
    message: 'Activity Set!',
  });
  bar1.update(500);
  bar1.stop;
  console.clear();
  console.log(chalk.magenta('[APP]: ') + chalk.grey('App successfully started, waiting for events...'));

  const guildId = '1385681613349978164';
  const categoryId = '1385690225983881226';
  const channelName = '🌌・server-status';
  const statusUrl = `${ServerCheck}`;
  const updateInterval = 30 * 1000; 

  try {
    const guild = await client.guilds.fetch(guildId);
    await guild.channels.fetch();
    const existingChannel = guild.channels.cache.find(
      ch => ch.name === channelName && ch.parentId === categoryId
    );
    if (existingChannel) {
      await existingChannel.delete('Recreating server-status channel');
    }
    const statusChannel = await guild.channels.create({
      name: channelName,
      type: 0,
      parent: categoryId,
      reason: 'Server status channel (re)created on bot launch'
    });

    lastStatus = await checkServerStatus();
    lastUpdateTime = new Date();
    const embed = buildStatusEmbed(lastStatus);
    statusMessage = await statusChannel.send({ embeds: [embed] });
    await cleanStatusChannel(statusChannel, statusMessage);

    setInterval(async () => {
      lastStatus = await checkServerStatus();
      lastUpdateTime = new Date();
      const embed = buildStatusEmbed(lastStatus);
      if (statusMessage && statusMessage.editable !== false) {
        await statusMessage.edit({ embeds: [embed] });
        await cleanStatusChannel(statusChannel, statusMessage);
      } else {
        statusMessage = await statusChannel.send({ embeds: [embed] });
        await cleanStatusChannel(statusChannel, statusMessage);
      }
    }, updateInterval);

    console.log('🌌・server-status channel checked and (re)created.');
  } catch (err) {
    console.error('Error handling server-status channel:', err);
  }
});

client.on('messageCreate', async (message) => {if (message.author.bot) return;log(`${chalk.yellow('User: ')} ${chalk.cyan(message.author.username)} ${chalk.cyanBright('|')} ${chalk.yellow('Guild: ')} ${chalk.cyan(message.guild.name)} ${chalk.cyanBright('|')} ${chalk.yellow('Channel: ')} ${chalk.cyan(message.channel.name)} ${chalk.cyanBright('|')} ${chalk.yellow('Message:')} ${chalk.cyan(message.content)} ${chalk.red('[TYPE: MessageCreate]')}`);});
client.on('channelDelete', async (delchannel) => { const guild = delchannel.guild; auditLogs = await guild.fetchAuditLogs({ limit: 1, type: 12 }); const entry = auditLogs.entries.first();if (entry) {const executor = entry.executor;log(`${chalk.yellow('User: ')} ${chalk.cyan(executor.username)} ${chalk.cyanBright('|')} ${chalk.yellow('Guild: ')} ${chalk.cyan(delchannel.guild)} ${chalk.cyanBright('|')} ${chalk.yellow('Channel: ')} ${chalk.cyan(delchannel.name)} ${chalk.cyanBright('|')} ${chalk.yellow('ChannelType: ')} ${chalk.cyan(delchannel.type)} ${chalk.red('[TYPE: ChannelDelete]')}`);}});
client.on('channelCreate', async (crechannel) => { const guild = crechannel.guild; auditLogs = await guild.fetchAuditLogs({ limit: 1, type: 12 }); const entry = auditLogs.entries.first();if (entry) {const executor = entry.executor;log(`${chalk.yellow('User: ')} ${chalk.cyan(executor.username)} ${chalk.cyanBright('|')} ${chalk.yellow('Guild: ')} ${chalk.cyan(crechannel.guild)} ${chalk.cyanBright('|')} ${chalk.yellow('Channel: ')} ${chalk.cyan(crechannel.name)} ${chalk.cyanBright('|')} ${chalk.yellow('ChannelType: ')} ${chalk.cyan(crechannel.type)} ${chalk.red('[TYPE: ChannelCreate]')}`);}});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const commandName = interaction.commandName;
  const args = interaction.options;

  if (commandName === 'ping') {
    await interaction.reply("Pinging... [----------]");
    const dat = Date.now();
    const latency = dat - interaction.createdTimestamp;
    if (isNaN(latency)) {
      await interaction.editReply(`⌛ Latency is for some reason not available right now.  -  ⏲ API Ping is ${Math.round(client.ws.ping)}`);
    } else {
      await interaction.editReply(`⌛ Latency is ${latency}ms  -  ⏲ API Ping is ${Math.round(client.ws.ping)}`);
    }
  }

  if (commandName === 'statusnote') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }
    const custom = args.getString('custom');
    const preset = args.getString('preset');
    if (custom) {
      statusNote = custom;
    } else if (preset) {
      statusNote = preset;
    } else {
      statusNote = '‎';
    }
    if (statusMessage) {
      const embed = buildStatusEmbed(lastStatus);
      await statusMessage.edit({ embeds: [embed] });
      await cleanStatusChannel(statusMessage.channel, statusMessage);
    }
    await interaction.reply({ content: 'Status note updated!', ephemeral: true });
  }
});

client.login(token);