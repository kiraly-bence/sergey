import BaseVoiceActivityChart from './BaseVoiceActivityChart.js';
import VoiceActivity from '../../classes/VoiceActivity.js';

export default class VoiceActivityDailyProbabilityChart extends BaseVoiceActivityChart {
    static labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    static subtitle = 'Chance of the user being in a voice channel (by months)';

    /**
     * @param {object[]} voiceActivities
     * @returns {number[]} 12 probabilities (0–1), January=0 to December=11
     */
    static compute(voiceActivities) {
        const sessions = VoiceActivity.buildSessions(voiceActivities);

        if (sessions.length === 0) return new Array(12).fill(0);

        const allYears = new Set();
        for (const { start, end } of sessions) {
            const cursor = new Date(start);
            while (cursor <= end) {
                allYears.add(cursor.getFullYear());
                cursor.setMonth(cursor.getMonth() + 1);
            }
        }
        const totalYears = allYears.size;

        const monthActivity = new Array(12).fill(null).map(() => new Set());
        for (const { start, end } of sessions) {
            const cursor = new Date(start);
            cursor.setDate(1);
            cursor.setHours(0, 0, 0, 0);
            while (cursor <= end) {
                monthActivity[cursor.getMonth()].add(cursor.getFullYear());
                cursor.setMonth(cursor.getMonth() + 1);
            }
        }

        return monthActivity.map(s => s.size / totalYears);
    }
}