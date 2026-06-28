import DB from '../classes/DB.js';

/**
 * General helper class for voice activity related stuff (mostly used by commands).
 */
export default class VoiceActivity {
    /**
     * Builds voice sessions from voice_activities rows.
     * If a session is currently ongoing and hasn't ended yet, it sets the end timestamp to now.
     * 
     * @param {object[]} voiceActivities
     * @returns {object[]}
     */
    static buildSessions(voiceActivities) {
        const sessions = [];
        let pendingJoin = null;

        for (const voiceActivity of voiceActivities) {
            if (voiceActivity.type === 'join') {
                pendingJoin = new Date(voiceActivity.timestamp);
            } else if (voiceActivity.type === 'leave' && pendingJoin) {
                sessions.push({ start: pendingJoin, end: new Date(voiceActivity.timestamp) });
                pendingJoin = null;
            }
        }

        if (pendingJoin) {
            sessions.push({ start: pendingJoin, end: new Date() });
        }

        return sessions;
    }

    /**
     * Builds sessions from raw join/leave activity rows.
     *
     * @param {Array<{id: string, user_id: string, guild_id: string, voice_channel_id: string, type: 'join'|'leave', timestamp: Date}>} activities
     * @return {Array<{user_id: string, guild_id: string, voice_channel_id: string, join: Date, leave: Date|null}>}
     */
    static buildSessions_migrate(activities) {
        const sessions = [];

        // Group by user+guild
        const groups = {};
        for (const activity of activities) {
            const key = `${activity.user_id}:${activity.guild_id}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(activity);
        }

        for (const rows of Object.values(groups)) {
            // Ensure chronological order
            rows.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            let openSession = null;

            for (const row of rows) {
                if (row.type === 'join') {
                    if (openSession) {
                        // Two joins in a row — data error, close the previous one without a leave
                        sessions.push(openSession);
                    }
                    openSession = {
                        user_id:          row.user_id,
                        guild_id:         row.guild_id,
                        voice_channel_id: row.voice_channel_id,
                        join:             row.timestamp,
                        leave:            null,
                    };

                } else if (row.type === 'leave') {
                    if (!openSession) {
                        // Leave with no matching join — skip it
                        continue;
                    }
                    openSession.leave = row.timestamp;
                    sessions.push(openSession);
                    openSession = null;
                }
            }

            // Any session still open at the end had no matching leave
            if (openSession) {
                sessions.push(openSession);
            }
        }

        return sessions;
    }

    /**
     * Groups voiceActivities by user_id and builds sessions per user.
     * Returns a map of userId -> sessions.
     * 
     * @param {object[]} voiceActivities
     * @returns {Map<string, object[]>}
     */
    static buildSessionsByUser(voiceActivities) {
        const byUser = {};
        for (const voiceActivity of voiceActivities) {
            if (!byUser[voiceActivity.user_id]) byUser[voiceActivity.user_id] = [];
            byUser[voiceActivity.user_id].push(voiceActivity);
        }

        const result = new Map();
        for (const [userId, voiceActivitiesByUser] of Object.entries(byUser)) {
            result.set(userId, this.buildSessions(voiceActivitiesByUser));
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
    static async getAverageDailyVoiceUsageOfUser(userId, guildId) {
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

        return this.calculateAverageDailySessionLength(sessions);
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
            const totalMs = sessions.reduce((sum, { start, end }) => sum + (end - start), 0);
            const avgMs = this.calculateAverageDailySessionLength(sessions);

            results.push({
                userId: userId,
                totalMs: totalMs,
                avgMs: avgMs,
            });
        }

        return results
            .sort((a, b) => b.totalMs - a.totalMs)
            .slice(0, 10);
    }

    /**
     * Calculates the average daily session length from session objects.
     * It accurately handles sessions that go beyond midnight, or multiple sessions on the same day.
     * 
     * @param {*} sessions
     * @returns {number} Average session length in milliseconds
     */
    static calculateAverageDailySessionLength(sessions) {
        // TODO: az isOngoing session-öket nem kéne beleszámolni (hisz nem tudjuk előre, hogy meddig fog tartani)
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
     * @returns {Promise<object>}
     */
    static async getLastSession(userId, guildId) {
        const lastJoin = await DB.first(`
            select *
            from voice_activities
            where user_id = :user_id
            and guild_id = :guild_id
            and type = 'join'
            order by timestamp desc
            limit 1
        `, {
            user_id: userId,
            guild_id: guildId,
        });

        const lastLeave = await DB.first(`
            select *
            from voice_activities
            where user_id = :user_id
            and guild_id = :guild_id
            and type = 'leave'
            order by timestamp desc
            limit 1
        `, {
            user_id: userId,
            guild_id: guildId,
        });

        let voiceActivities = [];

        if (lastJoin) {
            voiceActivities.push(lastJoin);
        } else {
            return null;
        }

        if (lastLeave) {
            voiceActivities.push(lastLeave);
        }

        const sessions = this.buildSessions(voiceActivities);

        if (sessions.length === 0) {
            return null;
        }

        const lastSession = sessions[sessions.length - 1];
        const isOngoing = !lastLeave;

        return {
            isOngoing: isOngoing,
            start: lastSession.start,
            end: lastSession.end,
            length: lastSession.end - lastSession.start,
        };
    }
}