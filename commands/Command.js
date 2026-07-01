import Discord from 'discord.js';
import Permission from '#classes/Permission.js';

export default class Command {
    command;
    requiredPermissions = [];
    isEphemeral = false;

    async beforeExecute(interaction) {
        await interaction.deferReply({
            flags: [
                this.isEphemeral ? Discord.MessageFlags.Ephemeral : 0,
            ],
        });

        if (!await this.hasRequiredPermissions(interaction.user.id)) {
            await interaction.editReply('You do not have permission to use this command.');
            return false;
        }

        return true;
    }

    async execute(interaction) {
        throw new Error('No action specified.');
    }

    async hasRequiredPermissions(userId) {
        return await Permission.checkUserPermissions(userId, this.requiredPermissions);
    }
}