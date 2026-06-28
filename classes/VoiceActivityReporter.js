import cron from 'node-cron';
import Discord from 'discord.js';
import DB from './DB.js';
import Sergey from './Sergey.js';
import VoiceActivityChart from './VoiceActivityChart.js';

/**
 * Responsible for sending automated reports of voice activity on the server.
 */
export default class VoiceActivityReporter {
    static init() {
        // Daily report - every day at 23:59
        cron.schedule('59 23 * * *', () => this._sendDailyReports());

        // Weekly report - every Sunday at 23:59
        cron.schedule('59 23 * * 0', () => this._sendWeeklyReports());

        // Yearly report - every Dec 31 at 23:59
        cron.schedule('59 23 31 12 *', () => this._sendYearlyReports());
    }

    static async _sendDailyReports() {
        const now = new Date();
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);

        await this._sendReports('daily', start, end);
    }

    static async _sendWeeklyReports() {
        const now = new Date();
        // Start of the week (Monday)
        const start = new Date(now);
        start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);

        await this._sendReports('weekly', start, end);
    }

    static async _sendYearlyReports() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);

        await this._sendReports('yearly', start, end);
    }

    /**
     * @param {'daily' | 'weekly' | 'yearly'} interval
     * @param {Date} start
     * @param {Date} end
     */
    static async _sendReports(interval, start, end) {
        const reports = await DB.query('select * from voice_activity_reports');

        for (const report of reports) {
            try {
                await this._sendGuildReport(report.guild_id, report.channel_id, interval, start, end);
            } catch (error) {
                console.error(`Failed to send ${interval} voice activity report for guild ${report.guild_id}:`, error);
            }
        }
    }

    /**
     * @param {string} guildId
     * @param {string} channelId
     * @param {'daily' | 'weekly' | 'yearly'} interval
     * @param {Date} start
     * @param {Date} end
     */
    static async _sendGuildReport(guildId, channelId, interval, start, end) {
        const voiceActivities = await DB.query(`
            select *
            from voice_activities
            where guild_id = :guild_id
            and timestamp between :start and :end
            and is_enabled = 1
            order by timestamp
        `, {
            guild_id: guildId,
            start,
            end,
        });

        if (voiceActivities.length === 0) {
            return;
        }

        const guild = await Sergey.client.guilds.fetch(guildId);
        const pngBuffer = await VoiceActivityChart.generate(voiceActivities, guild.name, interval, 'average');
        const channel = await guild.channels.fetch(channelId);
        
        await channel.send({
            content: this._reportTitle(interval, start),
            files: [new Discord.AttachmentBuilder(pngBuffer, { name: 'voice_activity.png' })],
        });
    }

    /**
     * @param {'daily' | 'weekly' | 'yearly'} interval
     * @param {Date} start
     * @returns {string}
     */
    static _reportTitle(interval, start) {
        switch (interval) {
            case 'daily':
                return `📊 Daily voice activity report for ${start.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
            case 'weekly':
                return `📊 Weekly voice activity report for week of ${start.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
            case 'yearly':
                return `📊 Yearly voice activity report for ${start.getFullYear()}`;
        }
    }
}