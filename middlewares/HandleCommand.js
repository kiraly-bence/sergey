import Middleware from './Middleware.js';
import Sergey from '../classes/Sergey.js';

export default class HandleCommand extends Middleware {
    async run(interaction) {
        const command = Sergey.commands.find(command => command.command.name === interaction.commandName);

        if (!command) {
            throw new Error(`No command matching ${interaction.commandName} was found.`);
        }

        if (!await command.beforeExecute(interaction)) {
            return;
        }
        
        await command.execute(interaction);
    }
}