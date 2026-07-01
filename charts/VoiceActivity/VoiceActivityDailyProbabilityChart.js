import BaseVoiceActivityChart from '#charts/VoiceActivity/BaseVoiceActivityChart.js';
import VoiceActivity from '#classes/VoiceActivity.js';

export default class VoiceActivityDailyProbabilityChart extends BaseVoiceActivityChart {
    static labels = Array.from({ length: 24 }, (_, i) => i.toString());
    static subtitle = 'Chance of the user being in a voice channel (by hours)';

    /**
     * @param {object[]} sessionRows voice_sessions rows
     * @returns {number[]} 24 probabilities (0–1), one per hour
     */
    static compute(sessionRows) {
        const sessions = sessionRows.map(sessionRow => VoiceActivity.buildSession(sessionRow));

        if (sessions.length === 0) {
            return new Array(24).fill(0);
        }

        const allDays = new Set();

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

        const totalDays = allDays.size;
        const activityByHour = new Array(24).fill(null).map(() => new Set());

        for (const { start, end } of sessions) {
            const cursor = new Date(start);
            cursor.setMinutes(0, 0, 0);

            while (cursor < end) {
                activityByHour[cursor.getHours()].add(cursor.toDateString());
                cursor.setHours(cursor.getHours() + 1);
            }
        }

        return activityByHour.map(s => s.size / totalDays);
    }
}