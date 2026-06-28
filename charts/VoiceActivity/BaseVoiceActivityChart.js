import sharp from 'sharp';

/**
 * Responsible for creating charts of voice activity.
 */
export default class BaseVoiceActivityChart {
    static labels;
    static subtitle;

    static compute(voiceActivities) {
        throw new Error('No computation action set.');
    }

    /**
     * Builds the raw SVG data.
     * 
     * @param {number[]} values Array of values to display
     * @param {string[]} labels Labels for each bar
     * @param {string} displayName Display name for the chart title
     * @param {string} subtitle Subtitle for the chart
     * @param {'probability' | 'average'} calculationType
     * @returns {string} SVG string
     */
    static buildSVG(values, labels, displayName, subtitle, calculationType) {
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

        const maxValue = calculationType === 'probability'
            ? 1
            : Math.max(...values, 1);

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

            const label = calculationType === 'probability'
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
            const gridLabel = calculationType === 'probability'
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
     * Generates the PNG buffer of a voice activity chart.
     * 
     * @param {object[]} voiceActivities voice_activities rows
     * @param {string} displayName Display name for the chart title
     * @param {'daily' | 'weekly' | 'yearly'} interval
     * @param {'probability' | 'average'} calculationType
     * @returns {Promise<Buffer>} PNG buffer
     */
    static async generate(voiceActivities, displayName, interval, calculationType) {
        const svg = this.buildSVG(
            this.compute(voiceActivities),
            this.labels,
            displayName,
            this.subtitle,
            calculationType,
        );
        
        return await sharp(Buffer.from(svg)).png().toBuffer();
    }
}