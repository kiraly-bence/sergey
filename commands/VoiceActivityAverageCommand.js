import Command from './Command.js';
import Formatter from '../classes/Formatter.js';
import VoiceActivity from '../classes/VoiceActivity.js';
import * as Discord from 'discord.js';

export default class VoiceActivityAverageCommand extends Command {
    command = new Discord.SlashCommandBuilder()
        .setName('voice-activity-average')
        .setDescription('Show the average time a user spends in voice channels.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user you want to see the average voice usage for.')
                .setRequired(true)
        );

    async execute(interaction) {
        let user = interaction.options.getUser('user');
        let name = user.globalName || user.username;

        const avgMs = await VoiceActivity.getAverageDailyVoiceUsage(user.id, interaction.guild.id);
        const formattedDuration = Formatter.formatDuration(avgMs);

        await interaction.editReply(`${name} spends ${formattedDuration} in voice channels on average per day.`);
    }
}