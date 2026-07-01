import MessageMiddleware from './MessageMiddleware.js';
import Log from '../../classes/Log.js';
import Formatter from '../../classes/Formatter.js';
import * as Discord from 'discord.js';

export default class LogMessageToConsole extends MessageMiddleware {
    async run(message) {
        let displayName = message.author.globalName || message.author.username;
        let breadcrumbs = message.channel.type === Discord.ChannelType.DM
            ? ['DM', displayName]
            : [message.guild.name, '#' + message.channel.name, displayName];

        let text = `${breadcrumbs.join(' > ')}: ${Formatter.removeFormatting(message.content)}`;

        Log.console(text);
    }
}