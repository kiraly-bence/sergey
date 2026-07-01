import * as Discord from 'discord.js';
import DB from '#classes/DB.js';
import Log from '#classes/Log.js';
import MessageScheduler from '#classes/MessageScheduler.js';
import LolTracker from '#classes/LolTracker.js';
import Prison from '#classes/Prison.js';
import VoiceActivityTracker from '#classes/VoiceActivityTracker.js';
import VoiceActivityReporter from '#classes/VoiceActivityReporter.js';
import HandleCommand from '#middlewares/command/HandleCommand.js';
import LogCommandUsageToDatabase from '#middlewares/command/LogCommandUsageToDatabase.js';
import LogMessageToConsole from '#middlewares/message/LogMessageToConsole.js';
import ExportWordsFromMessage from '#middlewares/message/ExportWordsFromMessage.js';
import AutoReact from '#middlewares/message/AutoReact.js';
import AutoReply from '#middlewares/message/AutoReply.js';
import ExportAllMessagesCommand from '#commands/ExportAllMessagesCommand.js';
import FreeCommand from '#commands/FreeCommand.js';
import ImgCommand from '#commands/ImgCommand.js';
import ImitateCommand from '#commands/ImitateCommand.js';
import InsultCommand from '#commands/InsultCommand.js';
import PrisonCommand from '#commands/PrisonCommand.js';
import RandomWordCommand from '#commands/RandomWordCommand.js';
import RedditCommand from '#commands/RedditCommand.js';
import RollCommand from '#commands/RollCommand.js';
import TerminateCommand from '#commands/TerminateCommand.js';
import VoiceActivityChartCommand from '#commands/VoiceActivityChartCommand.js';
import VoiceActivityDailyAverageCommand from '#commands/VoiceActivityDailyAverageCommand.js';
import VoiceActivityLeaderboardCommand from '#commands/VoiceActivityLeaderboardCommand.js';
import WordCountCommand from '#commands/WordCountCommand.js';
import WordMostUsedByCommand from '#commands/WordMostUsedByCommand.js';

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
        command: [
            HandleCommand,
            LogCommandUsageToDatabase,
        ],
        message: [
            LogMessageToConsole,
            ExportWordsFromMessage,
            AutoReact,
            AutoReply,
        ],
    };

    static async init() {
        await Log.init();
        await DB.init();
        await MessageScheduler.init();
        await Prison.init();
        await VoiceActivityTracker.init();
        await VoiceActivityReporter.init();

        if (process.env.RIOT_API_TOKEN) {
            await LolTracker.init();
        }

        // TODO: Fortnite tracker

        await this.registerCommands();
        await this.registerMiddlewares();
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
            this.client.on(listener.event, (...params) => {
                try {
                    listener.listener(...params);
                } catch (err) {
                    Log.error(err);
                }
            });
        }

        this.client.login(process.env.TOKEN);
    }
}