import Command from '#/commands/Command.js';
import Formatter from '#/classes/Formatter.js';
import VoiceActivity from '#/classes/VoiceActivity.js';
import * as Discord from 'discord.js';

export default class VoiceActivityLeaderboardCommand extends Command {
    command = new Discord.SlashCommandBuilder()
        .setName('voice-activity-leaderboard')
        .setDescription('Show the voice activity leaderboard for the server.');

    async execute(interaction) {
        const leaderboard = await VoiceActivity.getLeaderboard(interaction.guild.id);

        if (leaderboard.length === 0) {
            await interaction.editReply('No voice activity found for this server.');
            return;
        }

        const lines = await Promise.all(leaderboard.map(async ({ userId, totalMs, avgMs }, i) => {
            const user = await interaction.guild.members.fetch(userId);
            const totalUsage = Formatter.formatDuration(totalMs);
            const averageDailyUsage = Formatter.formatDuration(avgMs);

            return `**${i + 1}. ${user.displayName}:** ${totalUsage} (daily average: ${averageDailyUsage})`;
        }));

        await interaction.editReply('Total time spent in voice channels:\n\n' + lines.join('\n'));
    }
}