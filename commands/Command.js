import Permission from '../classes/Permission.js';

export default class Command {
    command;
    requiredPermissions = [];
    isEphemeral = false;

    async beforeExecute(interaction) {
        await interaction.deferReply({ ephemeral: this.isEphemeral });

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