import BaseVoiceActivityChart from './BaseVoiceActivityChart.js';
import VoiceActivity from '../../classes/VoiceActivity.js';

export default class VoiceActivityWeeklyProbabilityChart extends BaseVoiceActivityChart {
    static labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    static subtitle = 'Chance of the user being in a voice channel (by days)';

    /**
     * @param {object[]} sessionRows voice_sessions rows
     * @returns {number[]} 7 probabilities (0–1), Monday=0 to Sunday=6
     */
    static compute(sessionRows) {
        const sessions = sessionRows.map(sessionRow => VoiceActivity.buildSession(sessionRow));

        if (sessions.length === 0) {
            return new Array(7).fill(0);
        }

        const allWeeks = new Set();
        
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

        const totalWeeks = allWeeks.size;
        const activityByDayOfWeek = new Array(7).fill(null).map(() => new Set());

        for (const { start, end } of sessions) {
            const cursor = new Date(start);
            cursor.setHours(0, 0, 0, 0);

            while (cursor <= end) {
                const dayOfWeek = (cursor.getDay() + 6) % 7;
                const monday = new Date(cursor);
                monday.setDate(cursor.getDate() - dayOfWeek);
                activityByDayOfWeek[dayOfWeek].add(monday.toDateString());
                cursor.setDate(cursor.getDate() + 1);
            }
        }

        return activityByDayOfWeek.map(s => s.size / totalWeeks);
    }
}