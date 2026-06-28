import Command from './Command.js';
import DB from '../classes/DB.js';
import VoiceActivityChart from '../classes/VoiceActivityChart.js';
import * as Discord from 'discord.js';

export default class VoiceActivityCommand extends Command {
    command = new Discord.SlashCommandBuilder()
        .setName('voice-activity')
        .setDescription('Show voice activity statistics.')
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('The type of voice activity to display.')
                .addChoices(
                    { name: 'daily', value: 'daily' },
                    { name: 'weekly', value: 'weekly' },
                    { name: 'yearly', value: 'yearly' },
                )
                .setRequired(true)
        )
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user you want to view voice activity for.')
        );

    async execute(interaction) {
        let user = interaction.options.getUser('user') || null;
        let periodType = interaction.options.getString('type');
        let chartType = user
            ? 'probability'
            : 'average';
        let displayName = user
            ? (user.globalName || user.username)
            : interaction.guild.name;

        const voiceActivites = await DB.query(`
            select *
            from voice_activities
            where (:user_id is null or user_id = :user_id)
            and guild_id = :guild_id
            order by timestamp
        `, {
            user_id: user?.id ?? null,
            guild_id: interaction.guild.id,
        });

        const pngBuffer = await VoiceActivityChart.generate(voiceActivites, displayName, periodType, chartType);

        await interaction.editReply({
            files: [new Discord.AttachmentBuilder(pngBuffer, { name: 'voice_activity.png' })],
        });
    }
}