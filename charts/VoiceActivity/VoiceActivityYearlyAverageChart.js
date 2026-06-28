import BaseVoiceActivityChart from './BaseVoiceActivityChart.js';
import VoiceActivity from '../../classes/VoiceActivity.js';

export default class VoiceActivityYearlyAverageChart extends BaseVoiceActivityChart {
    static labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    static subtitle = 'Average number of users in voice channels (by months)';

    /**
     * @param {object[]} voiceActivities
     * @returns {number[]} 24 rounded averages, one per hour
     */
    static compute(voiceActivities) {
        const sessionsByUser = VoiceActivity.buildSessionsByUser(voiceActivities);

        // Collect all days across all sessions
        const allDates = new Set();
        for (const sessions of sessionsByUser.values()) {
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
        }
        const totalDays = allDates.size;
        if (totalDays === 0) return new Array(24).fill(0);

        // For each hour slot, count distinct users active on each day
        // hourActivity[h] = Map<dayKey, Set<userId>>
        const hourActivity = new Array(24).fill(null).map(() => new Map());

        for (const [userId, sessions] of sessionsByUser) {
            for (const { start, end } of sessions) {
                const cursor = new Date(start);
                cursor.setMinutes(0, 0, 0);
                while (cursor < end) {
                    const hour = cursor.getHours();
                    const dayKey = cursor.toDateString();
                    if (!hourActivity[hour].has(dayKey)) hourActivity[hour].set(dayKey, new Set());
                    hourActivity[hour].get(dayKey).add(userId);
                    cursor.setHours(cursor.getHours() + 1);
                }
            }
        }

        return hourActivity.map(dayMap => {
            const total = [...dayMap.values()].reduce((sum, users) => sum + users.size, 0);
            return Math.round(total / totalDays);
        });
    }
}