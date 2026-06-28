import * as Discord from 'discord.js';
import Log from './Log.js';
import MessageScheduler from './MessageScheduler.js';
import LolTracker from './LolTracker.js';
import Prison from './Prison.js';
import VoiceActivityTracker from './VoiceActivityTracker.js';
import VoiceActivityReporter from './VoiceActivityReporter.js';
import MiddlewareHandler from './MiddlewareHandler.js';
import LogToConsole from '../middlewares/LogToConsole.js';
import FetchWords from '../middlewares/FetchWords.js';
import AutoReact from '../middlewares/AutoReact.js';
import AutoReply from '../middlewares/AutoReply.js';
import HandleCommand from '../middlewares/HandleCommand.js';
import LogCommand from '../middlewares/LogCommand.js';
import FetchallCommand from '../commands/FetchallCommand.js';
import FreeCommand from '../commands/FreeCommand.js';
import ImgCommand from '../commands/ImgCommand.js';
import ImitateCommand from '../commands/ImitateCommand.js';
import InsultCommand from '../commands/InsultCommand.js';
import PrisonCommand from '../commands/PrisonCommand.js';
import RedditCommand from '../commands/RedditCommand.js';
import RollCommand from '../commands/RollCommand.js';
import TerminateCommand from '../commands/TerminateCommand.js';
import VoiceActivityChartCommand from '../commands/VoiceActivityChartCommand.js';
import VoiceActivityDailyAverageCommand from '../commands/VoiceActivityDailyAverageCommand.js';
import VoiceActivityLeaderboardCommand from '../commands/VoiceActivityLeaderboardCommand.js';
import WordCommand from '../commands/WordCommand.js';
import WordCountCommand from '../commands/WordCountCommand.js';
import WordMostUsedByCommand from '../commands/WordMostUsedByCommand.js';

export default class Sergey {
    static client;

    static commands = [
        new FetchallCommand(),
        new FreeCommand(),
        new ImgCommand(),
        new ImitateCommand(),
        new InsultCommand(),
        new PrisonCommand(),
        new RedditCommand(),
        new RollCommand(),
        new TerminateCommand(),
        new VoiceActivityChartCommand(),
        new VoiceActivityDailyAverageCommand(),
        new VoiceActivityLeaderboardCommand(),
        new WordCommand(),
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

        this.client.on(Discord.Events.MessageCreate, async message => {
            try {
                await MiddlewareHandler.call(message, [
                    new LogToConsole(),
                    new FetchWords(),
                    new AutoReact(),
                    new AutoReply(),
                ]);
            } catch (err) {
                Log.error(err);
            }
        });

        this.client.on(Discord.Events.InteractionCreate, async interaction => {
            if (!interaction.isChatInputCommand()) {
                return;
            }

            try {
                await MiddlewareHandler.call(interaction, [
                    new HandleCommand(),
                    new LogCommand(),
                ]);
            } catch (err) {
                Log.error(err);
            }
        });

        this.client.login(process.env.TOKEN);
    }
}