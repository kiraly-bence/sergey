import MessageMiddleware from './MessageMiddleware.js';
import Formatter from '../../classes/Formatter.js';
import DB from '../../classes/DB.js';
import * as Discord from 'discord.js';

export default class AutoReply extends MessageMiddleware {
    async shouldRun(message) {
        return !message.author.bot;
    }

    async run(message) {
        const autoReplies = await DB.query('select * from auto_replies where is_enabled = 1');

        for (const autoReply of autoReplies) {
            let normalizedMessage = Formatter.removeAccents(message.content).toLowerCase();
            let normalizedKeyword = Formatter.removeAccents(autoReply.keyword).toLowerCase();

            if (this.shouldReply(normalizedKeyword, normalizedMessage, autoReply.match_mode)) {
                await message.reply({
                    content: autoReply.message,
                    files: autoReply.embed ? [new Discord.AttachmentBuilder(autoReply.embed)] : [],
                });
            }
        }
    }

    shouldReply(keyword, message, matchMode) {
        switch (matchMode) {
            case 'message':
                return message === keyword;

            case 'word':
                return message.split(' ').some(word => word === keyword);

            case 'any':
                return message.includes(keyword);
            
            default:
                throw new Error('Invalid match mode.');
        }
    }
}