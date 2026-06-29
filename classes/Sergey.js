import * as Discord from 'discord.js';
import Log from './Log.js';
import MessageScheduler from './MessageScheduler.js';
import LolTracker from './LolTracker.js';
import Prison from './Prison.js';
import VoiceActivityTracker from './VoiceActivityTracker.js';
import VoiceActivityReporter from './VoiceActivityReporter.js';
import MiddlewareHandler from './MiddlewareHandler.js';
import LogMessageToConsole from '../middlewares/LogMessageToConsole.js';
import ExportWordsFromMessage from '../middlewares/ExportWordsFromMessage.js';
import AutoReact from '../middlewares/AutoReact.js';
import AutoReply from '../middlewares/AutoReply.js';
import HandleCommand from '../middlewares/HandleCommand.js';
import LogCommandUsageToDatabase from '../middlewares/LogCommandUsageToDatabase.js';
import ExportAllMessagesCommand from '../commands/ExportAllMessagesCommand.js';
import FreeCommand from '../commands/FreeCommand.js';
import ImgCommand from '../commands/ImgCommand.js';
import ImitateCommand from '../commands/ImitateCommand.js';
import InsultCommand from '../commands/InsultCommand.js';
import PrisonCommand from '../commands/PrisonCommand.js';
import RandomWordCommand from '../commands/RandomWordCommand.js';
import RedditCommand from '../commands/RedditCommand.js';
import RollCommand from '../commands/RollCommand.js';
import TerminateCommand from '../commands/TerminateCommand.js';
import VoiceActivityChartCommand from '../commands/VoiceActivityChartCommand.js';
import VoiceActivityDailyAverageCommand from '../commands/VoiceActivityDailyAverageCommand.js';
import VoiceActivityLeaderboardCommand from '../commands/VoiceActivityLeaderboardCommand.js';
import WordCountCommand from '../commands/WordCountCommand.js';
import WordMostUsedByCommand from '../commands/WordMostUsedByCommand.js';

export default class Sergey {
    static client;

    static commands = [
        new ExportAllMessagesCommand(),
        new FreeCommand(),
        new ImgCommand(),
        new ImitateCommand(),
        new InsultCommand(),
        new PrisonCommand(),
        new RandomWordCommand(),
        new RedditCommand(),
        new RollCommand(),
        new TerminateCommand(),
        new VoiceActivityChartCommand(),
        new VoiceActivityDailyAverageCommand(),
        new VoiceActivityLeaderboardCommand(),
        new WordCountCommand(),
        new WordMostUsedByCommand(),
    ];

    static async init() {
        this.registerCommands();
        this.registerClient();
        await MessageScheduler.init();
        await Prison.init();
        await VoiceActivityTracker.init();
        await VoiceActivityReporter.init();

        if (process.env.RIOT_API_TOKEN) {
            await LolTracker.init();
        }
    }

    static registerCommands() {
        const discordApi = new Discord.REST().setToken(process.env.TOKEN);

        discordApi.put(Discord.Routes.applicationCommands(process.env.CLIENT_ID), {
            body: this.commands.map(command => command.command),
        });
    }

    static registerClient() {
        // TODO: meg lehetne csinálni azt, hogy a különböző providerek adják hozzá a nekik kellő intent-eket a client-hez
        this.client = new Discord.Client({
            intents: [
                Discord.GatewayIntentBits.Guilds,
                Discord.GatewayIntentBits.GuildMessages,
                Discord.GatewayIntentBits.MessageContent,
                Discord.GatewayIntentBits.GuildMessageReactions,
                Discord.GatewayIntentBits.GuildEmojisAndStickers,
                Discord.GatewayIntentBits.GuildVoiceStates,
            ],
        });

        this.client.on(Discord.Events.ClientReady, () => {
            Log.console(`Connected as ${this.client.user.tag}`);
        });

        // TODO: ezt ki lehetne szervezni 4 különböző providerbe
        this.client.on(Discord.Events.MessageCreate, async message => {
            try {
                await MiddlewareHandler.call(message, [
                    new LogMessageToConsole(),
                    new ExportWordsFromMessage(),
                    new AutoReact(),
                    new AutoReply(),
                ]);
            } catch (err) {
                Log.error(err);
            }
        });

        // TODO: ezt ki lehetne szervezni 2 külön providerbe
        this.client.on(Discord.Events.InteractionCreate, async interaction => {
            if (!interaction.isChatInputCommand()) {
                return;
            }

            try {
                await MiddlewareHandler.call(interaction, [
                    new HandleCommand(),
                    new LogCommandUsageToDatabase(),
                ]);
            } catch (err) {
                Log.error(err);
            }
        });

        // TODO: a cél az lenne, hogy a providerek ilyen ki-be kapcsolható elemekként működjenek, és elég legyen csak 1 helyen hozzáadni/kiszedni őket, ne kelljen vadászni a különböző middleware-eket, intent-eket stb.

        this.client.login(process.env.TOKEN);
    }
}