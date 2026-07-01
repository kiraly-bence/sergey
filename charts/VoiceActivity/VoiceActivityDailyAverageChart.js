import BaseVoiceActivityChart from '#/charts/VoiceActivity/BaseVoiceActivityChart.js';
import VoiceActivity from '#/classes/VoiceActivity.js';

export default class VoiceActivityDailyAverageChart extends BaseVoiceActivityChart {
    static labels = Array.from({ length: 24 }, (_, i) => i.toString());
    static subtitle = 'Average number of users in voice channels (by hours)';

    /**
     * @param {object[]} sessionRows voice_sessions rows
     * @returns {number[]} 24 rounded averages, one per hour
     */
    static compute(sessionRows) {
        const sessionsByUser = VoiceActivity.buildSessionsByUser(sessionRows);
        const allDays = new Set();

        for (const [userId, sessions] of Object.entries(sessionsByUser)) {
            for (const { start, end } of sessions) {
                const day = new Date(start);
                day.setHours(0, 0, 0, 0);

                const endDay = new Date(end);
                endDay.setHours(0, 0, 0, 0);

                while (day <= endDay) {
                    allDays.add(day.toDateString());
                    day.setDate(day.getDate() + 1);
                }
            }
        }

        const totalDays = allDays.size;

        if (totalDays === 0) {
            return new Array(24).fill(0);
        }

        // For each hour slot, count distinct users active on each day
        // activityByHour[h] = Map<dayKey, Set<userId>>
        const activityByHour = new Array(24).fill(null).map(() => new Map());

        for (const [userId, sessions] of Object.entries(sessionsByUser)) {
            for (const { start, end } of sessions) {
                const cursor = new Date(start);
                cursor.setMinutes(0, 0, 0);

                while (cursor < end) {
                    const hour = cursor.getHours();
                    const dayKey = cursor.toDateString();

                    if (!activityByHour[hour].has(dayKey)) {
                        activityByHour[hour].set(dayKey, new Set());
                    }
                    
                    activityByHour[hour].get(dayKey).add(userId);
                    cursor.setHours(cursor.getHours() + 1);
                }
            }
        }

        return activityByHour.map(dayMap => {
            const total = [...dayMap.values()].reduce((sum, users) => sum + users.size, 0);
            return Math.round(total / totalDays);
        });
    }
}