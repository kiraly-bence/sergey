import BaseVoiceActivityChart from './BaseVoiceActivityChart.js';
import VoiceActivity from '../../classes/VoiceActivity.js';

export default class VoiceActivityWeeklyAverageChart extends BaseVoiceActivityChart {
    static labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    static subtitle = 'Average number of users in voice channels (by days)';

    /**
     * @param {object[]} voiceActivities
     * @returns {number[]} 7 rounded averages, Monday=0 to Sunday=6
     */
    static compute(voiceActivities) {
        const sessionsByUser = VoiceActivity.buildSessionsByUser(voiceActivities);

        const allWeeks = new Set();
        for (const sessions of sessionsByUser.values()) {
            for (const { start, end } of sessions) {
                const cursor = new Date(start);
                cursor.setHours(0, 0, 0, 0);
                while (cursor <= end) {
                    const monday = new Date(cursor);
                    monday.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
                    allWeeks.add(monday.toDateString());
                    cursor.setDate(cursor.getDate() + 1);
                }
            }
        }
        const totalWeeks = allWeeks.size;
        if (totalWeeks === 0) return new Array(7).fill(0);

        // dowActivity[monDay] = Map<weekKey, Set<userId>>
        const dowActivity = new Array(7).fill(null).map(() => new Map());

        for (const [userId, sessions] of sessionsByUser) {
            for (const { start, end } of sessions) {
                const cursor = new Date(start);
                cursor.setHours(0, 0, 0, 0);
                while (cursor <= end) {
                    const monDay = (cursor.getDay() + 6) % 7;
                    const monday = new Date(cursor);
                    monday.setDate(cursor.getDate() - monDay);
                    const weekKey = monday.toDateString();
                    if (!dowActivity[monDay].has(weekKey)) dowActivity[monDay].set(weekKey, new Set());
                    dowActivity[monDay].get(weekKey).add(userId);
                    cursor.setDate(cursor.getDate() + 1);
                }
            }
        }

        return dowActivity.map(weekMap => {
            const total = [...weekMap.values()].reduce((sum, users) => sum + users.size, 0);
            return Math.round(total / totalWeeks);
        });
    }
}