import sharp from 'sharp';
import VoiceActivity from './VoiceActivity.js';

/**
 * Responsible for creating charts of voice activity.
 */
export default class VoiceActivityChart {
    /**
     * @param {object[]} voiceActivities
     * @returns {number[]} 24 probabilities (0–1), one per hour
     */
    static _computeDailyProbabilities(voiceActivities) {
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

    /**
     * @param {object[]} voiceActivities
     * @returns {number[]} 7 probabilities (0–1), Monday=0 to Sunday=6
     */
    static _computeWeeklyProbabilities(voiceActivities) {
        const sessions = VoiceActivity.buildSessions(voiceActivities);

        if (sessions.length === 0) return new Array(7).fill(0);

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

        const dowActivity = new Array(7).fill(null).map(() => new Set());
        for (const { start, end } of sessions) {
            const cursor = new Date(start);
            cursor.setHours(0, 0, 0, 0);
            while (cursor <= end) {
                const monDay = (cursor.getDay() + 6) % 7;
                const monday = new Date(cursor);
                monday.setDate(cursor.getDate() - monDay);
                dowActivity[monDay].add(monday.toDateString());
                cursor.setDate(cursor.getDate() + 1);
            }
        }

        return dowActivity.map(s => s.size / totalWeeks);
    }

    /**
     * @param {object[]} voiceActivities
     * @returns {number[]} 12 probabilities (0–1), January=0 to December=11
     */
    static _computeYearlyProbabilities(voiceActivities) {
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

    /**
     * @param {object[]} voiceActivities
     * @returns {number[]} 24 rounded averages, one per hour
     */
    static _computeDailyAverages(voiceActivities) {
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

    /**
     * @param {object[]} voiceActivities
     * @returns {number[]} 7 rounded averages, Monday=0 to Sunday=6
     */
    static _computeWeeklyAverages(voiceActivities) {
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

    /**
     * @param {object[]} voiceActivities
     * @returns {number[]} 12 rounded averages, January=0 to December=11
     */
    static _computeYearlyAverages(voiceActivities) {
        const sessionsByUser = VoiceActivity.buildSessionsByUser(voiceActivities);

        const allYears = new Set();
        for (const sessions of sessionsByUser.values()) {
            for (const { start, end } of sessions) {
                const cursor = new Date(start);
                while (cursor <= end) {
                    allYears.add(cursor.getFullYear());
                    cursor.setMonth(cursor.getMonth() + 1);
                }
            }
        }
        const totalYears = allYears.size;
        if (totalYears === 0) return new Array(12).fill(0);

        // monthActivity[month] = Map<yearKey, Set<userId>>
        const monthActivity = new Array(12).fill(null).map(() => new Map());

        for (const [userId, sessions] of sessionsByUser) {
            for (const { start, end } of sessions) {
                const cursor = new Date(start);
                cursor.setDate(1);
                cursor.setHours(0, 0, 0, 0);
                while (cursor <= end) {
                    const month = cursor.getMonth();
                    const yearKey = cursor.getFullYear();
                    if (!monthActivity[month].has(yearKey)) monthActivity[month].set(yearKey, new Set());
                    monthActivity[month].get(yearKey).add(userId);
                    cursor.setMonth(cursor.getMonth() + 1);
                }
            }
        }

        return monthActivity.map(yearMap => {
            const total = [...yearMap.values()].reduce((sum, users) => sum + users.size, 0);
            return Math.round(total / totalYears);
        });
    }

    /**
     * @param {number[]} values Array of values to display
     * @param {string[]} labels Labels for each bar
     * @param {string} displayName Display name for the chart title
     * @param {string} subtitle Subtitle for the chart
     * @param {'probability' | 'average'} mode
     * @returns {string} SVG string
     */
    static buildSVG(values, labels, displayName, subtitle, mode) {
        const W = 900;
        const H = 400;
        const padLeft = 60;
        const padRight = 30;
        const padTop = 80;
        const padBottom = 50;
        const chartW = W - padLeft - padRight;
        const chartH = H - padTop - padBottom;
        const count = values.length;
        const barW = chartW / count;
        const gap = 3;

        const maxValue = mode === 'probability' ? 1 : Math.max(...values, 1);

        const bars = values.map((v, i) => {
            const x = padLeft + i * barW + gap / 2;
            const barH = (v / maxValue) * chartH;
            const y = padTop + chartH - barH;
            const w = barW - gap;

            const p = v / maxValue; // normalized 0–1 for color
            const r = Math.round(88 + p * 100);
            const g = Math.round(101 + p * 20);
            const b = Math.round(242 - p * 50);
            const alpha = 0.3 + p * 0.7;

            const label = mode === 'probability'
                ? (v > 0.05 ? (v * 100).toFixed(0) + '%' : '')
                : (v > 0 ? v.toString() : '');

            return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${barH.toFixed(1)}" 
                fill="rgba(${r},${g},${b},${alpha.toFixed(2)})" rx="3"/>
                <text x="${(x + w / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" 
                text-anchor="middle" font-size="10" fill="#a0a0c0" font-family="monospace">${label}</text>`;
        }).join('\n');

        const barLabels = labels.map((label, i) => {
            const x = padLeft + i * barW + barW / 2;
            const y = padTop + chartH + 20;
            return `<text x="${x.toFixed(1)}" y="${y}" text-anchor="middle" font-size="11" 
                fill="#808099" font-family="monospace">${label}</text>`;
        }).join('\n');

        const gridLines = [0.25, 0.5, 0.75, 1.0].map(v => {
            const y = padTop + chartH - v * chartH;
            const gridLabel = mode === 'probability'
                ? (v * 100).toFixed(0) + '%'
                : Math.round(v * maxValue).toString();
            return `<line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${padLeft + chartW}" y2="${y.toFixed(1)}" 
                stroke="#2a2a3e" stroke-width="1"/>
                <text x="${padLeft - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="11" 
                fill="#606080" font-family="monospace">${gridLabel}</text>`;
        }).join('\n');

        return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
            <rect width="${W}" height="${H}" fill="#0f0f1a" rx="12"/>

            <text x="${W / 2}" y="36" text-anchor="middle" font-size="18" font-weight="bold"
                fill="#c8c8ff" font-family="monospace">Voice Activity — ${displayName}</text>

            <text x="${W / 2}" y="54" text-anchor="middle" font-size="12"
                fill="#606080" font-family="monospace">${subtitle}</text>

            ${gridLines}
            ${bars}
            ${barLabels}

            <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${padTop + chartH}" stroke="#3a3a5e" stroke-width="1"/>
            <line x1="${padLeft}" y1="${padTop + chartH}" x2="${padLeft + chartW}" y2="${padTop + chartH}" stroke="#3a3a5e" stroke-width="1"/>
        </svg>`;
    }

    /**
     * @param {object[]} voiceActivities voice_activities rows
     * @param {string} displayName Display name for the chart title
     * @param {'daily' | 'weekly' | 'yearly'} periodType
     * @param {'probability' | 'average'} chartType
     * @returns {Promise<Buffer>} PNG buffer
     */
    static async generate(voiceActivities, displayName, periodType, chartType) {
        const config = {
            daily: {
                labels: Array.from({ length: 24 }, (_, i) => i.toString()),
                probability: {
                    compute: () => this._computeDailyProbabilities(voiceActivities),
                    subtitle: 'Probability of being in voice per hour',
                },
                average: {
                    compute: () => this._computeDailyAverages(voiceActivities),
                    subtitle: 'Average number of users in voice per hour',
                },
            },
            weekly: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                probability: {
                    compute: () => this._computeWeeklyProbabilities(voiceActivities),
                    subtitle: 'Probability of being in voice per day of week',
                },
                average: {
                    compute: () => this._computeWeeklyAverages(voiceActivities),
                    subtitle: 'Average number of users in voice per day of week',
                },
            },
            yearly: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                probability: {
                    compute: () => this._computeYearlyProbabilities(voiceActivities),
                    subtitle: 'Probability of being in voice per month',
                },
                average: {
                    compute: () => this._computeYearlyAverages(voiceActivities),
                    subtitle: 'Average number of users in voice per month',
                },
            },
        };

        if (!config[periodType]) {
            throw new Error(`Unknown period type: ${periodType}`);
        }
        
        if (!config[periodType][chartType]) {
            throw new Error(`Unknown chart type: ${chartType}`);
        }

        const { labels, [chartType]: { compute, subtitle } } = config[periodType];
        const svg = this.buildSVG(compute(), labels, displayName, subtitle, chartType);
        return await sharp(Buffer.from(svg)).png().toBuffer();
    }
}