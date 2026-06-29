import Command from './Command.js';
import DB from '../classes/DB.js';
import * as Discord from 'discord.js';

export default class RandomWordCommand extends Command {
    command = new Discord.SlashCommandBuilder()
        .setName('random-word')
        .setDescription('Get a random word starting with a certain letter.')
        .addStringOption(option => 
            option
                .setName('letter')
                .setDescription('The letter the word should start with.')
                .setMaxLength(1)
                .setRequired(true)
        );

    async execute(interaction) {
        let letter = interaction.options.getString('letter');

        let word = await DB.first('select * from random_words where word like :letter order by rand() limit 1', { letter: letter + '%' });

        if (!word) {
            await interaction.editReply(`No words found that start with "${letter}".`);
            return;
        }

        await interaction.editReply(word.word);
    }
}