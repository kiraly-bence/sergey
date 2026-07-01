import Middleware from '#/middlewares/Middleware.js';
import Sergey from '#/classes/Sergey.js';
import * as Discord from 'discord.js';

export default class CommandMiddleware extends Middleware {
    static async init() {
        super.init();

        Sergey.listeners.push({
            event: Discord.Events.InteractionCreate,
            listener: async interaction => {
                if (!interaction.isChatInputCommand()) {
                    return;
                }

                const middleware = new this();
            
                if (await middleware.shouldRun(interaction)) {
                    await middleware.run(interaction);
                }
            },
        });
    }
}