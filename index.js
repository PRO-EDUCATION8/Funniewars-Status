require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const util = require('minecraft-server-util');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const CHANNEL_ID = '1417538914524205158';
const MC_SERVER = 'funniewars.live';
const CHECK_INTERVAL = 30000; // 30 seconds

let miniOngoing = false;

// =======================
// Check Minecraft Server
// =======================
async function checkServer() {
    try {
        const result = await util.status(MC_SERVER);
        const playerCount = result.players.online;

        const channel = client.channels.cache.get(CHANNEL_ID);
        if (!channel) return;

        if (playerCount >= 20 && !miniOngoing) {
            await channel.send('@everyone There\'s a mini ongoing!');
            miniOngoing = true;
        } else if (playerCount < 20 && miniOngoing) {
            await channel.send('The mini has ended!');
            miniOngoing = false;
        }
    } catch (error) {
        console.error('Error checking server:', error);
    }
}

// =======================
// Slash Commands
// =======================
const commands = [
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Check Minecraft server status')
        .toJSON(),

    new SlashCommandBuilder()
        .setName('players')
        .setDescription('List all online players')
        .toJSON(),

    new SlashCommandBuilder()
        .setName('player')
        .setDescription('Check if a specific player is online')
        .addStringOption(option =>
            option.setName('username')
                  .setDescription('Minecraft username')
                  .setRequired(true)
        )
        .toJSON()
];

// =======================
// Register Commands
// =======================
client.once('ready', async () => {
    console.log('Bot is ready!');

    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('Slash commands registered successfully!');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }

    // Start auto server check
    setInterval(checkServer, CHECK_INTERVAL);
});

// =======================
// Slash Command Handler
// =======================
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    // ---------- STATUS ----------
    if (interaction.commandName === 'status') {
        await interaction.deferReply();
        try {
            const result = await util.status(MC_SERVER);
            const playerCount = result.players.online;
            const playerList = result.players.sample 
                ? result.players.sample.map(p => p.name).join(', ')
                : 'No players online';

            await interaction.editReply({
                embeds: [{
                    title: '🎮 Minecraft Server Status',
                    fields: [
                        { name: 'Server', value: MC_SERVER, inline: true },
                        { name: 'Players', value: `${playerCount}/${result.players.max}`, inline: true },
                        { name: 'Status', value: '🟢 Online', inline: true },
                        { name: 'Version', value: result.version.name, inline: true },
                        { name: 'MOTD', value: result.motd.clean || 'No MOTD', inline: false },
                        { name: 'Players Online', value: playerList, inline: false }
                    ],
                    color: 0x00ff00,
                    timestamp: new Date()
                }]
            });
        } catch (error) {
            await interaction.editReply({
                embeds: [{
                    title: '❌ Server Status Error',
                    description: 'Could not connect to the Minecraft server. It may be offline.',
                    color: 0xff0000,
                    timestamp: new Date()
                }]
            });
        }
    }

    // ---------- PLAYERS ----------
    if (interaction.commandName === 'players') {
        await interaction.deferReply();
        try {
            const result = await util.status(MC_SERVER);
            const playerList = result.players.sample 
                ? result.players.sample.map(p => p.name).join(', ')
                : 'No players online';

            await interaction.editReply({
                content: `🟢 Players Online: ${playerList}`
            });
        } catch (error) {
            await interaction.editReply('❌ Could not fetch server players.');
        }
    }

    // ---------- PLAYER ----------
    if (interaction.commandName === 'player') {
        await interaction.deferReply();

        const username = interaction.options.getString('username');
        try {
            const result = await util.status(MC_SERVER);
            const onlinePlayers = result.players.sample
                ? result.players.sample.map(p => p.name)
                : [];

            if (onlinePlayers.includes(username)) {
                await interaction.editReply(`✅ **${username}** is online!`);
            } else {
                await interaction.editReply(`❌ **${username}** is not online.`);
            }
        } catch (error) {
            await interaction.editReply('❌ Could not fetch server status.');
        }
    }
});

// =======================
// Auto-Reply for "WE WANT A MINI"
// =======================
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content.toUpperCase() === "WE WANT A MINI") {
        await message.channel.send("Right on it! Whore");
    }
});

// =======================
// Bot Login
// =======================
if (!process.env.DISCORD_TOKEN) {
    console.error('Missing DISCORD_TOKEN in .env');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);