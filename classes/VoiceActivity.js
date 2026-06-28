import DB from '../classes/DB.js';

/**
 * General helper class for voice activity related stuff (mostly used by commands).
 */
export default class VoiceActivity {
    /**
     * @param {object[]} voiceActivities
     * @returns {{ start: Date, end: Date }[]}
     */
    static buildSessions(voiceActivities) {
        const rows = [...voiceActivities].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        const sessions = [];
        let pendingJoin = null;

        for (const row of rows) {
            if (row.type === 'join') {
                pendingJoin = new Date(row.timestamp);
            } else if (row.type === 'leave' && pendingJoin) {
                sessions.push({ start: pendingJoin, end: new Date(row.timestamp) });
                pendingJoin = null;
            }
        }

        if (pendingJoin) {
            sessions.push({ start: pendingJoin, end: new Date() });
        }

        return sessions;
    }

    /**
     * Groups voiceActivities by user_id and builds sessions per user.
     * Returns a map of userId -> sessions.
     * 
     * @param {object[]} voiceActivities
     * @returns {Map<string, { start: Date, end: Date }[]>}
     */
    static buildSessionsByUser(voiceActivities) {
        const byUser = {};
        for (const row of voiceActivities) {
            if (!byUser[row.user_id]) byUser[row.user_id] = [];
            byUser[row.user_id].push(row);
        }

        const result = new Map();
        for (const [userId, rows] of Object.entries(byUser)) {
            result.set(userId, this.buildSessions(rows));
        }
        return result;
    }

    /**
     * Returns the average daily voice usage for a user in a guild.
     * 
     * @param {*} userId 
     * @param {*} guildId 
     * @returns {Promise<number>} The average daily voice usage in milliseconds
     */
    static async getAverageDailyVoiceUsage(userId, guildId) {
        const voiceActivities = await DB.query(`
            select *
            from voice_activities
            where user_id = :user_id
            and guild_id = :guild_id
            order by timestamp
        `, {
            user_id: userId,
            guild_id: guildId,
        });

        const sessions = this.buildSessions(voiceActivities);

        return this._computeAverageDailyMs(sessions);
    }

    /**
     * Returns the top 10 users by average daily voice usage in a guild.
     * 
     * @param {string} guildId
     * @returns {Promise<object[]>}
     */
    static async getLeaderboard(guildId) {
        const voiceActivities = await DB.query(`
            select *
            from voice_activities
            where guild_id = :guild_id
            order by timestamp
        `, {
            guild_id: guildId,
        });

        const sessionsByUser = this.buildSessionsByUser(voiceActivities);

        const results = [];

        for (const [userId, sessions] of sessionsByUser) {
            const avgMs = this._computeAverageDailyMs(sessions);

            results.push({
                userId: userId,
                avgMs: avgMs,
            });
        }

        return results
            .sort((a, b) => b.avgMs - a.avgMs)
            .slice(0, 10);
    }

    static _computeAverageDailyMs(sessions) {
        if (sessions.length === 0) {
            return 0;
        }

        const totalMs = sessions.reduce((sum, { start, end }) => sum + (end - start), 0);

        const allDates = new Set();
        for (const { start, end } of sessions) {
            const day = new Date(start);
            day.setHours(0, 0, 0, 0);
            const endDay = new Date(end);
            endDay.setHours(0, 0, 0, 0);
            while (day <= endDay) {
                allDates.add(day.toDateString());
                day.setDate(day.getDate() + 1);
            }
        }

        return totalMs / allDates.size;
    }
}