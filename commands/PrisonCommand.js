import Command from './Command.js';
import Formatter from '../classes/Formatter.js';
import Prison from '../classes/Prison.js';
import * as Discord from 'discord.js';

export default class PrisonCommand extends Command {
    command = new Discord.SlashCommandBuilder()
        .setName('prison')
        .setDescription('Lock a user into a voice channel.')
        .addUserOption(option => 
            option
                .setName('user')
                .setDescription('The user you want to lock into a voice channel.')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The voice channel you want to lock the user into.')
                .addChannelTypes(Discord.ChannelType.GuildVoice)
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('duration')
                .setDescription('The duration of the prison sentence. If not specified, the user will be locked indefinitely.')
                .addChoices(
                    { name: '1 minute', value: 1 },
                    { name: '2 minutes', value: 2 },
                    { name: '5 minutes', value: 5 },
                    { name: '15 minutes', value: 15 },
                    { name: '30 minutes', value: 30 },
                    { name: '1 hour', value: 60 },
                    { name: '2 hours', value: 120 },
                    { name: '4 hours', value: 240 },
                    { name: '8 hours', value: 480 },
                    { name: '12 hours', value: 720 },
                    { name: '24 hours', value: 1440 },
                )
        );

    async execute(interaction) {
        await interaction.deferReply();

        if (!this.isRequestedByOwner(interaction)) {
            await interaction.editReply('This command can only be used by the bot\'s owner.');
            return;
        }

        let member = interaction.options.getMember('user');
        let channel = interaction.options.getChannel('channel');
        let durationInMinutes = interaction.options.getInteger('duration');
        let expiresAt = durationInMinutes
            ? new Date(Date.now() + durationInMinutes * 60 * 1000)
            : null;

        await Prison.addPrisonRule(
            member.id,
            interaction.guild.id,
            channel.id,
            expiresAt,
        );

        if (member.voice.channel) {
            member.voice.setChannel(channel);
        }

        await interaction.editReply(`Locked <@${member.id}> into <#${channel.id}> (expires at: ${expiresAt ? Formatter.formatTimestamp(expiresAt) : 'never'})`);
        // TODO: hozzá kell adni a migrate.js-hez is ezt a táblát
    }
}