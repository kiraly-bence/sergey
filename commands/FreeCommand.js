import Command from './Command.js';
import Prison from '../classes/Prison.js';
import * as Discord from 'discord.js';

export default class FreeCommand extends Command {
    command = new Discord.SlashCommandBuilder()
        .setName('free')
        .setDescription('Free a user from the prison.')
        .addUserOption(option => 
            option
                .setName('user')
                .setDescription('The user you want to free from the prison.')
                .setRequired(true)
        );

    async execute(interaction) {
        await interaction.deferReply();

        if (!this.isRequestedByOwner(interaction)) {
            await interaction.editReply('This command can only be used by the bot\'s owner.');
            return;
        }

        let member = interaction.options.getMember('user');

        await Prison.freeUser(member.id, interaction.guild.id);

        await interaction.editReply(`<@${member.id}> has been freed from the prison.`);
    }
}