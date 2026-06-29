import BaseVoiceActivityChart from './BaseVoiceActivityChart.js';
import VoiceActivity from '../../classes/VoiceActivity.js';

export default class VoiceActivityWeeklyAverageChart extends BaseVoiceActivityChart {
    static labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    static subtitle = 'Average number of users in voice channels (by days)';

    /**
     * @param {object[]} sessionRows voice_sessions rows
     * @returns {number[]} 7 rounded averages, Monday=0 to Sunday=6
     */
    static compute(sessionRows) {
        const sessionsByUser = VoiceActivity.buildSessionsByUser(sessionRows);
        const allWeeks = new Set();

        for (const [userId, sessions] of Object.entries(sessionsByUser)) {
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

        if (totalWeeks === 0) {
            return new Array(7).fill(0);
        }

        // activityByDayOfWeek[dayOfWeek] = Map<weekKey, Set<userId>>
        const activityByDayOfWeek = new Array(7).fill(null).map(() => new Map());

        for (const [userId, sessions] of Object.entries(sessionsByUser)) {
            for (const { start, end } of sessions) {
                const cursor = new Date(start);
                cursor.setHours(0, 0, 0, 0);

                while (cursor <= end) {
                    const dayOfWeek = (cursor.getDay() + 6) % 7;
                    const monday = new Date(cursor);
                    monday.setDate(cursor.getDate() - dayOfWeek);
                    const weekKey = monday.toDateString();

                    if (!activityByDayOfWeek[dayOfWeek].has(weekKey)) {
                        activityByDayOfWeek[dayOfWeek].set(weekKey, new Set());
                    }

                    activityByDayOfWeek[dayOfWeek].get(weekKey).add(userId);
                    cursor.setDate(cursor.getDate() + 1);
                }
            }
        }

        return activityByDayOfWeek.map(weekMap => {
            const total = [...weekMap.values()].reduce((sum, users) => sum + users.size, 0);
            return Math.round(total / totalWeeks);
        });
    }
}