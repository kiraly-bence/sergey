import DB from '../classes/DB.js';

/**
 * General helper class for voice activity related stuff.
 */
export default class VoiceActivity {
    /**
     * Converts voice_session DB rows into session objects, and group them by user_id.
     *
     * @param {object[]} sessionRows voice_sessions rows
     * @returns {object[]}
     */
    static buildSessionsByUser(sessionRows) {
        const byUser = {};

        for (const sessionRow of sessionRows) {
            if (!byUser[sessionRow.user_id]) {
                byUser[sessionRow.user_id] = [];
            }
            
            byUser[sessionRow.user_id].push(this.buildSession(sessionRow));
        }

        return byUser;
    }

    /**
     * Convert a voice_sessions DB row into a session object.
     * 
     * @param {object} sessionRow voice_sessions row
     * @returns {object}
     */
    static buildSession(sessionRow) {
        let start = new Date(sessionRow.joined_at);
        let isOngoing = sessionRow.left_at === null;
        let end = isOngoing ? new Date() : new Date(sessionRow.left_at);
        let length = end - start;

        return {
            start: start,
            end: end,
            isOngoing: isOngoing,
            length: length,
        };
    }

    /**
     * Returns the average daily voice usage for a user in a guild.
     *
     * @param {string} userId
     * @param {string} guildId
     * @returns {Promise<number>} The average daily voice usage in milliseconds
     */
    static async getAverageDailyVoiceUsageOfUser(userId, guildId) {
        let sessions = await DB.query(`
            select joined_at, left_at
            from voice_sessions
            where user_id = :user_id
            and guild_id = :guild_id
            order by joined_at
        `, {
            user_id: userId,
            guild_id: guildId,
        });

        sessions = sessions.map(session => this.buildSession(session));

        return this.calculateAverageDailySessionLength(sessions);
    }

    /**
     * Returns the top 10 users by total voice usage in a guild.
     *
     * @param {string} guildId
     * @returns {Promise<object[]>}
     */
    static async getLeaderboard(guildId) {
        const sessions = await DB.query(`
            select user_id, joined_at, left_at
            from voice_sessions
            where guild_id = :guild_id
            order by joined_at
        `, {
            guild_id: guildId,
        });

        const sessionsByUser = this.buildSessionsByUser(sessions);
        const results = [];

        for (const [userId, userSessions] of Object.entries(sessionsByUser)) {
            const totalMs = userSessions.reduce((sum, { start, end }) => sum + (end - start), 0);
            const avgMs = this.calculateAverageDailySessionLength(userSessions);

            results.push({ userId: userId, totalMs: totalMs, avgMs: avgMs });
        }

        return results
            .sort((a, b) => b.totalMs - a.totalMs)
            .slice(0, 10);
    }

    /**
     * Calculates the average daily session length from session objects.
     * Accurately handles sessions that cross midnight or multiple sessions on the same day.
     *
     * @param {object[]} sessions
     * @returns {number} Average session length in milliseconds
     */
    static calculateAverageDailySessionLength(sessions) {
        // Exclude ongoing sessions
        sessions = sessions.filter(session => !session.isOngoing);

        if (sessions.length === 0) {
            return 0;
        }

        const dailyTotals = new Map();

        for (const { start, end } of sessions) {
            let cursor = new Date(start);

            while (cursor < end) {
                const dayKey = cursor.toDateString();
                const midnight = new Date(cursor);
                midnight.setHours(24, 0, 0, 0); // start of next day

                const segmentEnd = midnight < end ? midnight : end;
                const ms = segmentEnd - cursor;

                dailyTotals.set(dayKey, (dailyTotals.get(dayKey) ?? 0) + ms);
                cursor = midnight;
            }
        }

        const total = [...dailyTotals.values()].reduce((sum, ms) => sum + ms, 0);
        return total / dailyTotals.size;
    }

    /**
     * Returns the last voice session of a user.
     *
     * @param {string} userId
     * @param {string} guildId
     * @returns {Promise<object|null>}
     */
    static async getLastSession(userId, guildId) {
        const session = await DB.first(`
            select joined_at, left_at
            from voice_sessions
            where user_id = :user_id
            and guild_id = :guild_id
            order by joined_at desc
            limit 1
        `, {
            user_id: userId,
            guild_id: guildId,
        });

        if (!session) {
            return null;
        }

        return this.buildSession(session);
    }
}