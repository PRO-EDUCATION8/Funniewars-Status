require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    EmbedBuilder 
} = require('discord.js');
const util = require('minecraft-server-util');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// CONFIG
const CHANNEL_ID = '1417538914524205158';
const MC_SERVER = 'funniewars.live';
const CHECK_INTERVAL = 30_000; // 30 seconds
const PLAYER_THRESHOLD = 20;

let miniOngoing = false;

// --- 🧠 Server Checker ---
async function checkServer() {
    try {
        const result = await util.status(MC_SERVER);
        const online = result.players.online;
        const channel = client.channels.cache.get(CHANNEL_ID);
        if (!channel) return;

        if (online >= PLAYER_THRESHOLD && !miniOngoing) {
            const embed = new EmbedBuilder()
                .setTitle('🔥 Mini Started!')
                .setDescription(`@everyone A mini-game has just started on **${MC_SERVER}**!\nHop in now before it fills up!`)
                .setColor(0x00ff00)
                .setTimestamp();

            await channel.send({ content: '@everyone', embeds: [embed] });
            miniOngoing = true;
        } else if (online < PLAYER_THRESHOLD && miniOngoing) {
            const embed = new EmbedBuilder()
                .setTitle('💤 Mini Ended')
                .setDescription('The mini-game has ended. GG everyone!')
                .setColor(0xff0000)
                .setTimestamp();

            await channel.send({ embeds: [embed] });
            miniOngoing = false;
        }
    } catch (err) {
        console.error('Error checking server:', err);
    }
}

// --- ⚙️ Slash Command Setup ---
const commands = [
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Check the current FunnieWars server status.')
        .toJSON()
];

// --- 🚀 When Bot Is Ready ---
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    // Register Slash Commands
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Slash commands registered.');
    } catch (err) {
        console.error('❌ Failed to register commands:', err);
    }

    // Start periodic checks
    setInterval(checkServer, CHECK_INTERVAL);
});

// --- 💬 Slash Command Handling ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'status') {
        await interaction.deferReply();

        try {
            const res = await util.status(MC_SERVER);

            const playersOnline = res.players.online;
            const playersMax = res.players.max;
            const playerList = res.players.sample?.map(p => `• ${p.name}`).join('\n') || 'No players online 💤';

            const embed = new EmbedBuilder()
                .setTitle('🎮 FunnieWars Server Status')
                .setURL(`https://mcsrvstat.us/server/${MC_SERVER}`)
                .addFields(
                    { name: '🌍 Server IP', value: `\`${MC_SERVER}\``, inline: true },
                    { name: '👥 Players', value: `${playersOnline}/${playersMax}`, inline: true },
                    { name: '🧩 Version', value: res.version.name, inline: true },
                    { name: '💬 MOTD', value: res.motd.clean || 'No MOTD', inline: false },
                    { name: '📜 Players Online', value: playerList, inline: false }
                )
                .setColor(playersOnline > 0 ? 0x00ff00 : 0xffa500)
                .setFooter({ text: 'FunnieWars Live Status', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error('Error fetching server status:', err);

            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Server Offline')
                .setDescription('The Minecraft server might be offline or unreachable. Try again later.')
                .setColor(0xff0000)
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
});

// --- 🔑 Login ---
client.login(process.env.MTQzMDExOTI2ODA4Njk3MjU0OA.GDFci3.R-9IvC6BBf6wX_wSzyRp0H1E3A6NkhuBeSOPzE);
