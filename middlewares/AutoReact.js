import MessageMiddleware from './MessageMiddleware.js';
import Formatter from '../classes/Formatter.js';
import DB from '../classes/DB.js';
import * as Discord from 'discord.js';

export default class AutoReact extends MessageMiddleware {
    static requiredIntents = [
        ...MessageMiddleware.requiredIntents,
        Discord.GatewayIntentBits.GuildMessageReactions,
    ];

    async shouldRun(message) {
        return !message.author.bot;
    }

    async run(message) {
        const autoReactions = await DB.query('select * from auto_reactions where is_enabled = 1');

        for (const autoReaction of autoReactions) {
            let normalizedMessage = Formatter.removeAccents(message.content).toLowerCase();
            let normalizedKeyword = Formatter.removeAccents(autoReaction.keyword).toLowerCase();

            if (this.shouldReact(normalizedKeyword, normalizedMessage, autoReaction.match_mode)) {
                await message.react(autoReaction.emote);
            }
        }
    }

    shouldReact(keyword, message, matchMode) {
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