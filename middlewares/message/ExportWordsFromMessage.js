import MessageMiddleware from '#/middlewares/message/MessageMiddleware.js';
import MessageExporter from '#/classes/MessageExporter.js';

export default class ExportWordsFromMessage extends MessageMiddleware {
    async shouldRun(message) {
        return !message.author.bot && await MessageExporter.isExportableChannel(message.channelId);
    }

    async run(message) {
        await MessageExporter.fromMessage(message);
    }
}