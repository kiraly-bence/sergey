import BaseVoiceActivityChart from './BaseVoiceActivityChart.js';
import VoiceActivity from '../../classes/VoiceActivity.js';

export default class VoiceActivityDailyProbabilityChart extends BaseVoiceActivityChart {
    static labels = Array.from({ length: 24 }, (_, i) => i.toString());
    static subtitle = 'Chance of the user being in a voice channel (by hours)';

    /**
     * @param {object[]} voiceActivities
     * @returns {number[]} 24 probabilities (0–1), one per hour
     */
    static compute(voiceActivities) {
        const sessions = VoiceActivity.buildSessions(voiceActivities);

        if (sessions.length === 0) return new Array(24).fill(0);

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
        const totalDays = allDates.size;

        const hourActivity = new Array(24).fill(null).map(() => new Set());
        for (const { start, end } of sessions) {
            const cursor = new Date(start);
            cursor.setMinutes(0, 0, 0);
            while (cursor < end) {
                hourActivity[cursor.getHours()].add(cursor.toDateString());
                cursor.setHours(cursor.getHours() + 1);
            }
        }

        return hourActivity.map(s => s.size / totalDays);
    }
}