import Command from '#commands/Command.js';
import Formatter from '#classes/Formatter.js';
import VoiceActivity from '#classes/VoiceActivity.js';
import * as Discord from 'discord.js';

export default class VoiceActivityDailyAverageCommand extends Command {
    command = new Discord.SlashCommandBuilder()
        .setName('voice-activity-daily-average')
        .setDescription('Check the average time a user spends in voice channels daily.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user whose average daily voice activity you want to check.')
                .setRequired(true)
        );

    async execute(interaction) {
        let user = interaction.options.getUser('user');
        let name = user.globalName || user.username;

        const avgMs = await VoiceActivity.getAverageDailyVoiceUsageOfUser(user.id, interaction.guild.id);
        const formattedDuration = Formatter.formatDuration(avgMs);

        await interaction.editReply(`${name} spends ${formattedDuration} in voice channels on average per day.`);
    }
}