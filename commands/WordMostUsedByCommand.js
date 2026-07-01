import Command from '#/commands/Command.js';
import DB from '#/classes/DB.js';
import Utils from '#/classes/Utils.js';
import * as Discord from 'discord.js';

export default class WordMostUsedByCommand extends Command {
    command = new Discord.SlashCommandBuilder()
        .setName('word-most-used-by')
        .setDescription('Check who uses a certain word most often.')
        .addStringOption(option =>
            option
                .setName('word')
                .setDescription('The word you want to check for.')
                .setRequired(true)
        );

    async execute(interaction) {
        let word = interaction.options.getString('word');

        let results = await DB.query(`
            select author_id, count(*) as count
            from exported_words
            where word = :word
            and channel_id in (
                select channel_id
                from exportable_channels
                where is_enabled = 1
            )
            group by author_id
            order by count desc
        `, {
            word: word.toLowerCase(),
            guild_id: interaction.guild.id,
        });

        let reply = [];

        for (let result of results) {
            let member = await Utils.getMember(interaction.guild.id, result.author_id);

            if (!member) {
                continue;
            }

            let index = reply.length + 1;
            let name = member.nickname || member.user.globalName || member.user.username;
            let count = result.count;

            reply.push(`${index}. ${name}: ${count}`);

            if (reply.length === 5) {
                break;
            }
        }

        reply.unshift(`Top 5 users of the word "${word}":\n`);

        await interaction.editReply(reply.join('\n'));
    }
}