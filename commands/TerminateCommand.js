import Command from '#commands/Command.js';
import Log from '#classes/Log.js';
import * as Discord from 'discord.js';

export default class TerminateCommand extends Command {
    command = new Discord.SlashCommandBuilder()
        .setName('terminate')
        .setDescription('Terminates the bot.');
    
    requiredPermissions = ['TerminateCommand'];
    isEphemeral = true;

    async execute(interaction) {
        await interaction.editReply('Terminating the bot...');

        let logMessage = `Terminated by /${this.command.name} command.`;

        Log.console(logMessage);
        Log.file('info', logMessage);

        process.exit();
    }
}