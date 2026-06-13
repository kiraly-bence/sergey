import Command from './Command.js';
import MessageFetcher from '../classes/MessageFetcher.js';
import * as Discord from 'discord.js';
import DB from '../classes/DB.js';
import Log from '../classes/Log.js';

export default class FetchallCommand extends Command {
    command = new Discord.SlashCommandBuilder()
        .setName('fetchall')
        .setDescription('Export and store all messages from the channel.');

    requiredPermissions = ['FetchallCommand'];
    isEphemeral = true;

    async execute(interaction) {
        let fetchableChannels = await DB.query('select * from fetchable_channels where is_enabled = 1');

        await interaction.editReply(`Fetching messages in ${fetchableChannels.length} channels. Check the console for further info.`);

        for (const channel of fetchableChannels) {
            Log.console(`Fetching: ${channel.description}`);
            await MessageFetcher.fromChannel(channel.channel_id);
        }

        Log.console('Fetching messages done.');
    }
}