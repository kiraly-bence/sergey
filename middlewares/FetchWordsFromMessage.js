import Middleware from './Middleware.js';
import MessageFetcher from '../classes/MessageFetcher.js';

export default class FetchWordsFromMessage extends Middleware {
    async shouldRun(message) {
        return !message.author.bot && await MessageFetcher.isFetchableChannel(message.channelId);
    }

    async run(message) {
        await MessageFetcher.fromMessage(message);
    }
}