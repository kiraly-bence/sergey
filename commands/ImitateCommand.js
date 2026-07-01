import Command from '#commands/Command.js';
import Imitator from '#classes/Imitator.js';
import * as Discord from 'discord.js';

export default class ImitateCommand extends Command {
    command = new Discord.SlashCommandBuilder()
        .setName('imitate')
        .setDescription('Imitate someone\'s writing style.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user you want to imitate.')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('days')
                .setDescription('Set how recent should the messages be that will be used for imitation.')
        )
        .addIntegerOption(option =>
            option
                .setName('length')
                .setDescription('The length of the generated text.')
                .addChoices(
                    { name: 'short', value: 25 },
                    { name: 'medium (default)', value: 100 },
                    { name: 'long', value: 500 },
                )
        );

    async execute(interaction) {
        let user = interaction.options.getUser('user');
        let days = interaction.options.getInteger('days');
        let maxWords = interaction.options.getInteger('length') ?? 100;

        let imitator = new Imitator(user.id, days, maxWords);
        let text = await imitator.imitate();
        let name = user.globalName || user.username;

        await interaction.editReply(`"${text}" - ${name}`);
    }
}