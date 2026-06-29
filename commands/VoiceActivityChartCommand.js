import Command from './Command.js';
import DB from '../classes/DB.js';
import VoiceActivityDailyAverageChart from '../charts/VoiceActivity/VoiceActivityDailyAverageChart.js';
import VoiceActivityDailyProbabilityChart from '../charts/VoiceActivity/VoiceActivityDailyProbabilityChart.js';
import VoiceActivityWeeklyAverageChart from '../charts/VoiceActivity/VoiceActivityWeeklyAverageChart.js';
import VoiceActivityWeeklyProbabilityChart from '../charts/VoiceActivity/VoiceActivityWeeklyProbabilityChart.js';
import VoiceActivityYearlyAverageChart from '../charts/VoiceActivity/VoiceActivityYearlyAverageChart.js';
import VoiceActivityYearlyProbabilityChart from '../charts/VoiceActivity/VoiceActivityYearlyProbabilityChart.js';
import * as Discord from 'discord.js';

export default class VoiceActivityChartCommand extends Command {
    command = new Discord.SlashCommandBuilder()
        .setName('voice-activity-chart')
        .setDescription('Show a chart of the average voice activity.')
        .addStringOption(option =>
            option
                .setName('interval')
                .setDescription('Select the intervals to calculate averages for.')
                .addChoices(
                    { name: 'hours (0-24)', value: 'daily' },
                    { name: 'days (Monday-Sunday)', value: 'weekly' },
                    { name: 'months (January-December)', value: 'yearly' },
                )
                .setRequired(true)
        )
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user whose voice activity you want to see.')
        );

    async execute(interaction) {
        let user = interaction.options.getUser('user') || null;
        let interval = interaction.options.getString('interval');

        let calculationType = user
            ? 'probability'
            : 'average';

        let displayName = user
            ? (user.globalName || user.username)
            : interaction.guild.name;

        const sessions = await DB.query(`
            select *
            from voice_sessions
            where (:user_id is null or user_id = :user_id)
            and guild_id = :guild_id
        `, {
            user_id: user?.id ?? null,
            guild_id: interaction.guild.id,
        });

        const charts = {
            daily: {
                average: VoiceActivityDailyAverageChart,
                probability: VoiceActivityDailyProbabilityChart,
            },
            weekly: {
                average: VoiceActivityWeeklyAverageChart,
                probability: VoiceActivityWeeklyProbabilityChart,
            },
            yearly: {
                average: VoiceActivityYearlyAverageChart,
                probability: VoiceActivityYearlyProbabilityChart,
            },
        };

        const pngBuffer = await charts[interval][calculationType].generate(
            sessions,
            displayName,
            interval,
            calculationType,
        );

        await interaction.editReply({
            files: [new Discord.AttachmentBuilder(pngBuffer, { name: 'voice_activity.png' })],
        });
    }
}