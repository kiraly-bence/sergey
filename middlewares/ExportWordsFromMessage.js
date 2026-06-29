import Middleware from './Middleware.js';
import MessageExporter from '../classes/MessageExporter.js';

export default class ExportWordsFromMessage extends Middleware {
    async shouldRun(message) {
        return !message.author.bot && await MessageExporter.isExportableChannel(message.channelId);
    }

    async run(message) {
        await MessageExporter.fromMessage(message);
    }
}