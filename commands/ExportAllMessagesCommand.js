import Command from './Command.js';
import MessageExporter from '../classes/MessageExporter.js';
import * as Discord from 'discord.js';
import DB from '../classes/DB.js';
import Log from '../classes/Log.js';

export default class ExportAllMessagesCommand extends Command {
    command = new Discord.SlashCommandBuilder()
        .setName('export-all-messages')
        .setDescription('Export all messages from the channels specified in the database.');

    requiredPermissions = ['ExportAllMessagesCommand'];
    isEphemeral = true;

    async execute(interaction) {
        let exportableChannels = await DB.query('select * from exportable_channels where is_enabled = 1');

        await interaction.editReply(`Exporting messages from ${exportableChannels.length} channels. Check the console for further info.`);

        for (const channel of exportableChannels) {
            Log.console(`Exporting messages from: ${channel.description}`);
            await MessageExporter.fromChannel(channel.channel_id);
        }

        Log.console('Exporting messages done.');
    }
}