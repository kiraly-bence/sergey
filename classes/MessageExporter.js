import ExportedWord from '#/classes/ExportedWord.js';
import Formatter from '#/classes/Formatter.js';
import DB from '#/classes/DB.js';
import Utils from '#/classes/Utils.js';
import * as Discord from 'discord.js';

export default class MessageExporter {
    /**
     * Export words from a message and save them in the database.
     *
     * @param {Discord.Message} message
     * @return {Promise<void>}
     */
    static async fromMessage(message) {
        if (await this.isAlreadyExported(message.id)) {
            return;
        }

        // Get new words to be added
        let newWords = Formatter.removeFormatting(message.content)
            .toLowerCase()
            .split(' ')
            .map(word => word.trim())
            .filter(word => new ExportedWord({word}).canBeUsedToImitate());

        // Add new words to existing wordlist
        for (let i = 0; i < newWords.length; i++) {
            let prev_id = null;

            // If there is a previous word
            if (newWords[i - 1]) {
                // Search for it
                prev_id = (await DB.first(`
                    select *
                    from exported_words
                    where word = :word
                    order by id desc
                    limit 1
                `, { word: newWords[i - 1] }))?.id;
            }

            await DB.query(`
                insert into exported_words (
                    word,
                    prev_id,
                    author_id,
                    message_id,
                    channel_id,
                    guild_id,
                    created_at
                ) values (
                    :word,
                    :prevId,
                    :authorId,
                    :messageId,
                    :channelId,
                    :guildId,
                    :createdAt
                )
            `, {
                word: String(newWords[i]).substring(0, 255),
                prevId: prev_id,
                authorId: message.author.id,
                messageId: message.id,
                channelId: message.channel.id,
                guildId: message.guild.id,
                createdAt: new Date(message.createdTimestamp),
            });
        }
    }

    /**
     * Export words from messages in a channel and save them in the database.
     *
     * @param {string} channelId
     * @return {Promise<void>}
     */
    static async fromChannel(channelId) {
        let channel = Utils.getChannel(channelId);
        let lastId;

        while (true) {
            const messages = await channel.messages.fetch({
                limit: 100,
                ...(lastId && { before: lastId }),
            });

            // Add new
            for (const message of messages.values()) {
                if (message.author.bot) {
                    continue;
                }

                await this.fromMessage(message);
            }

            // If there are no more messages left
            if (messages.size === 0) {
                return;
            }

            lastId = messages.lastKey();
        }
    }

    /**
     * Check if exporting messages is allowed in the channel.
     * 
     * @param {string} channelId 
     * @return {Promise<boolean>}
     */
    static async isExportableChannel(channelId) {
        let results = await DB.query('select 1 from exportable_channels where channel_id = :channelId and is_enabled = 1 limit 1', { channelId: channelId });

        return results.length > 0;
    }

    /**
     * Check if a message has already been exported before.
     * 
     * @param {string} messageId 
     * @returns {Promise<boolean>}
     */
    static async isAlreadyExported(messageId) {
        let results = await DB.query('select 1 from exported_words where message_id = :messageId limit 1', { messageId: messageId });

        return results.length > 0;
    }
}