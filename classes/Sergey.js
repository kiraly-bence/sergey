import * as Discord from 'discord.js';
import Log from './Log.js';
import MessageScheduler from './MessageScheduler.js';
import LolTracker from './LolTracker.js';
import Prison from './Prison.js';
import VoiceActivityTracker from './VoiceActivityTracker.js';
import VoiceActivityReporter from './VoiceActivityReporter.js';
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

    static intents = new Set([
        Discord.GatewayIntentBits.Guilds,
    ]);

    static listeners = [
        {
            event: Discord.Events.ClientReady,
            listener: () => {
                Log.console(`Connected as ${this.client.user.tag}`);
            },
        },
    ];

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

    static middlewares = {
        message: [
            LogMessageToConsole,
            ExportWordsFromMessage,
            AutoReact,
            AutoReply,
        ],
        command: [
            HandleCommand,
            LogCommandUsageToDatabase,
        ],
    };

    static async init() {
        await this.registerCommands();
        await this.registerMiddlewares();
        await MessageScheduler.init();
        await Prison.init();
        await VoiceActivityTracker.init();
        await VoiceActivityReporter.init();

        if (process.env.RIOT_API_TOKEN) {
            await LolTracker.init();
        }

        this.registerClient();
    }

    static async registerCommands() {
        const discordApi = new Discord.REST().setToken(process.env.TOKEN);

        await discordApi.put(Discord.Routes.applicationCommands(process.env.CLIENT_ID), {
            body: this.commands.map(command => command.command),
        });
    }

    static async registerMiddlewares() {
        for (const [type, middlewares] of Object.entries(this.middlewares)) {
            for (const middleware of middlewares) {
                await middleware.init();
            }
        }
    }

    static registerClient() {
        this.client = new Discord.Client({
            intents: [...this.intents],
        });

        for (const listener of this.listeners) {
            this.client.on(listener.event, listener.callback);
        }

        this.client.login(process.env.TOKEN);
    }
}