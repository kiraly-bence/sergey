import Command from './Command.js';
import Formatter from '../classes/Formatter.js';
import VoiceActivity from '../classes/VoiceActivity.js';
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

        const lines = await Promise.all(leaderboard.map(async ({ userId, avgMs }, i) => {
            const user = await interaction.guild.members.fetch(userId);
            const formattedDuration = Formatter.formatDuration(avgMs);

            return `${i + 1}. ${user.displayName}: ${formattedDuration}`;
        }));

        await interaction.editReply(lines.join('\n'));
    }
}