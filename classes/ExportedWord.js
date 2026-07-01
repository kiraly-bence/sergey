import dayjs from 'dayjs';
import DB from '#/classes/DB.js';
import Formatter from '#/classes/Formatter.js';

export default class ExportedWord {
    id;
    word;
    prev_id;
    author_id;
    created_at;

    constructor(obj) {
        this.id = obj.id;
        this.word = obj.word;
        this.prev_id = obj.prev_id;
        this.author_id = obj.author_id;
        this.created_at = obj.created_at;
    }

    /**
     * Return the most common word to start a sentence with.
     *
     * @param {string} author_id
     * @param {number} offset
     * @param {number|null} days
     * @return {Promise<ExportedWord|null>}
     */
    static async getStarterWord(author_id, offset = 0, days = null) {
        const minDate = days
            ? Formatter.formatTimestamp(dayjs().subtract(days, 'days'))
            : '1970-01-01 00:00:00';

        let results = await DB.query(`
            select *
            from exported_words
            where author_id = :authorId
            and channel_id in (
                select channel_id
                from exportable_channels
                where is_enabled = 1
            )
            and created_at >= :minDate
            and prev_id is null
            group by word
            order by count(*) desc
            limit 1
            offset :offset
        `, {
            authorId: author_id,
            minDate: minDate,
            offset: offset,
        });
        
        return results.length > 0
            ? new ExportedWord(results[0])
            : null;
    }

    /**
     * Return the word that most often follows the current word.
     *
     * @param {number} offset
     * @param {number|null} days
     * @return {Promise<ExportedWord>}
     */
    async getNextFollowingWord(offset = 0, days = null) {
        const minDate = days
            ? dayjs()
                .subtract(days, 'days')
                .tz(process.env.TIMEZONE)
                .format('YYYY-MM-DD HH:mm:ss')
            : '1970-01-01 00:00:00'; // anything

        let results = await DB.query(`
            select *
            from exported_words
            where prev_id in (
                select id
                from exported_words
                where word = :word
                and author_id = :authorId
                and channel_id in (
                    select channel_id
                    from exportable_channels
                    where is_enabled = 1
                )
                and created_at >= :minDate
            )
            and author_id = :authorId
            and channel_id in (
                select channel_id
                from exportable_channels
                where is_enabled = 1
            )
            and created_at >= :minDate
            group by word
            order by count(*) desc
            limit 1
            offset :offset
        `, {
            word: this.word,
            authorId: this.author_id,
            minDate: minDate,
            offset: offset,
        });
        
        return results.length > 0
            ? new ExportedWord(results[0])
            : null;
    }

    /**
     * Check if the word is a valid URL.
     *
     * @return {boolean}
     */
    isUrl() {
        try {
            new URL(this.word);
        } catch (e) {
            return false;
        }

        return true;
    }

    /**
     * Check if the word is empty.
     *
     * @return {boolean}
     */
    isEmpty() {
        return !this.word;
    }

    /**
     * Check if the word is a Discord tag.
     *
     * @return {boolean}
     */
    isTag() {
        let prefixes = [
            '<@', // user
            '<#', // text channel
            '<#', // voice channel
            '<:', // emote
            '<a:', // animated emote
        ];

        return prefixes.some(prefix => this.word.startsWith(prefix));
    }

    /**
     * Check if the word is a command.
     *
     * @return {boolean}
     */
    isCommand() {
        return this.word.startsWith('!');
    }

    /**
     * We don't want to include meaningless things in imitated messages (such as URLs or tags).
     *
     * @return {boolean}
     */
    canBeUsedToImitate() {
        return !(this.isEmpty() || this.isUrl() || this.isTag() || this.isCommand());
    }
}