import Command from '#/commands/Command.js';
import Prison from '#/classes/Prison.js';
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
    
    requiredPermissions = ['PrisonCommand'];

    async execute(interaction) {
        let member = interaction.options.getMember('user');

        await Prison.freeUser(member.id, interaction.guild.id);

        await interaction.editReply(`<@${member.id}> has been freed from the prison.`);
    }
}