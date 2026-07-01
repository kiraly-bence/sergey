import BaseVoiceActivityChart from '#charts/VoiceActivity/BaseVoiceActivityChart.js';
import VoiceActivity from '#classes/VoiceActivity.js';

export default class VoiceActivityYearlyAverageChart extends BaseVoiceActivityChart {
    static labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    static subtitle = 'Average number of users in voice channels (by months)';

    /**
     * @param {object[]} sessionRows voice_sessions rows
     * @returns {number[]} 12 rounded averages, January=0 to December=11
     */
    static compute(sessionRows) {
        const sessionsByUser = VoiceActivity.buildSessionsByUser(sessionRows);
        const allYears = new Set();

        for (const [userId, sessions] of Object.entries(sessionsByUser)) {
            for (const { start, end } of sessions) {
                const cursor = new Date(start);

                while (cursor <= end) {
                    allYears.add(cursor.getFullYear());
                    cursor.setMonth(cursor.getMonth() + 1);
                }
            }
        }

        const totalYears = allYears.size;

        if (totalYears === 0) {
            return new Array(12).fill(0);
        }

        // activityByMonth[month] = Map<yearKey, Set<userId>>
        const activityByMonth = new Array(12).fill(null).map(() => new Map());

        for (const [userId, sessions] of Object.entries(sessionsByUser)) {
            for (const { start, end } of sessions) {
                const cursor = new Date(start);
                cursor.setDate(1);
                cursor.setHours(0, 0, 0, 0);

                while (cursor <= end) {
                    const month = cursor.getMonth();
                    const yearKey = cursor.getFullYear();

                    if (!activityByMonth[month].has(yearKey)) {
                        activityByMonth[month].set(yearKey, new Set());
                    }

                    activityByMonth[month].get(yearKey).add(userId);
                    cursor.setMonth(cursor.getMonth() + 1);
                }
            }
        }

        return activityByMonth.map(yearMap => {
            const total = [...yearMap.values()].reduce((sum, users) => sum + users.size, 0);
            return Math.round(total / totalYears);
        });
    }
}