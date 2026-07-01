import Command from '#commands/Command.js';
import DB from '#classes/DB.js';
import * as Discord from 'discord.js';

export default class InsultCommand extends Command {
    command = new Discord.SlashCommandBuilder()
        .setName('insult')
        .setDescription('Insult someone.')
        .addUserOption(option => 
            option
                .setName('user')
                .setDescription('The user you want to insult.')
                .setRequired(true)
        );

    async execute(interaction) {
        let user = interaction.options.getUser('user');
        let insult = await DB.first(`
            select *
            from (
                select *
                from insults
                where is_enabled = 1
                order by last_used_at
                limit 10
            ) as oldest
            order by rand()
            limit 1
        `);

        if (!insult) {
            await interaction.editReply('No insults found.');
            return;
        }

        await DB.query(`update insults set last_used_at = now() where id = ?`, [insult.id]);

        await interaction.editReply(`${user} ${insult.message}`);
    }
}