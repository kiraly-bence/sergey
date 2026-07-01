import Command from '#commands/Command.js';
import DB from '#classes/DB.js';
import * as Discord from 'discord.js';

export default class WordCountCommand extends Command {
    command = new Discord.SlashCommandBuilder()
        .setName('word-count')
        .setDescription('Count how many times someone has used a certain word.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user you want to check.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('word')
                .setDescription('The word you want to count.')
                .setRequired(true)
        );

    async execute(interaction) {
        let user = interaction.options.getUser('user');
        let word = interaction.options.getString('word');

        let count = (await DB.first(`
            select count(*) as count
            from exported_words
            where author_id = :author_id
            and word = :word
            and channel_id in (
                select channel_id
                from exportable_channels
                where is_enabled = 1
            )
        `, {
            author_id: user.id,
            word: word.toLowerCase(),
        })).count;

        let name = user.globalName || user.username;

        await interaction.editReply(`${name} has used the word "${word}" ${count} times.`);
    }
}