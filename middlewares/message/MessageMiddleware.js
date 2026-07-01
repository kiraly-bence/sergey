import Middleware from '#middlewares/Middleware.js';
import Sergey from '#classes/Sergey.js';
import * as Discord from 'discord.js';

export default class MessageMiddleware extends Middleware {
    static requiredIntents = [
        ...Middleware.requiredIntents,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
    ];

    static async init() {
        super.init();

        Sergey.listeners.push({
            event: Discord.Events.MessageCreate,
            listener: async message => {
                const middleware = new this();

                if (await middleware.shouldRun(message)) {
                    await middleware.run(message);
                }
            },
        });
    }
}