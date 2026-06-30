import cron from 'node-cron';
import Discord from 'discord.js';
import DB from './DB.js';
import Log from './Log.js';
import Sergey from './Sergey.js';
import VoiceActivityDailyAverageChart from '../charts/VoiceActivity/VoiceActivityDailyAverageChart.js';
import VoiceActivityWeeklyAverageChart from '../charts/VoiceActivity/VoiceActivityWeeklyAverageChart.js';
import VoiceActivityYearlyAverageChart from '../charts/VoiceActivity/VoiceActivityYearlyAverageChart.js';

/**
 * Responsible for sending automated reports of voice activity on the server.
 */
export default class VoiceActivityReporter {
    static init() {
        // Daily report - every day at 23:59
        cron.schedule('59 23 * * *', async () => {
            try {
                await this.sendDailyReports();
            } catch (err) {
                Log.error(err);
            }
        });

        // Weekly report - every Sunday at 23:59
        cron.schedule('59 23 * * 0', async () => {
            try {
                await this.sendWeeklyReports();
            } catch (err) {
                Log.error(err);
            }
        });

        // Yearly report - every Dec 31 at 23:59
        cron.schedule('59 23 31 12 *', async () => {
            try {
                await this.sendYearlyReports();
            } catch (err) {
                Log.error(err);
            }
        });
    }

    static async sendDailyReports() {
        const now = new Date();

        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);

        await this.sendReports('daily', start, end);
    }

    static async sendWeeklyReports() {
        const now = new Date();

        // Start of the week (Monday)
        const start = new Date(now);
        start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        start.setHours(0, 0, 0, 0);

        const end = new Date(now);
        end.setHours(23, 59, 59, 999);

        await this.sendReports('weekly', start, end);
    }

    static async sendYearlyReports() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);

        await this.sendReports('yearly', start, end);
    }

    /**
     * Sends voice activity reports in each guild.
     * 
     * @param {'daily' | 'weekly' | 'yearly'} interval
     * @param {Date} start
     * @param {Date} end
     */
    static async sendReports(interval, start, end) {
        const reports = await DB.query('select * from voice_activity_reports');

        for (const report of reports) {
            try {
                await this.sendGuildReport(report.guild_id, report.channel_id, interval, start, end);
            } catch (error) {
                console.error(`Failed to send ${interval} voice activity report for guild ${report.guild_id}:`, error);
            }
        }
    }

    /**
     * Sends a voice activity report in a specific guild.
     * 
     * @param {string} guildId
     * @param {string} channelId
     * @param {'daily' | 'weekly' | 'yearly'} interval
     * @param {Date} start
     * @param {Date} end
     */
    static async sendGuildReport(guildId, channelId, interval, start, end) {
        const sessions = await DB.query(`
            select *
            from voice_sessions
            where guild_id = :guild_id
            and timestamp between :start and :end
        `, {
            guild_id: guildId,
            start: start,
            end: end,
        });

        if (sessions.length === 0) {
            return;
        }

        const charts = {
            daily: VoiceActivityDailyAverageChart,
            weekly: VoiceActivityWeeklyAverageChart,
            yearly: VoiceActivityYearlyAverageChart,
        };

        const guild = await Sergey.client.guilds.fetch(guildId);
        const channel = await guild.channels.fetch(channelId);
        const pngBuffer = await charts[interval].generate(sessions, guild.name, interval, 'average');

        await channel.send({
            content: this.reportTitle(interval, start),
            files: [new Discord.AttachmentBuilder(pngBuffer, { name: 'voice_activity.png' })],
        });
    }

    /**
     * Generates the message content of a voice activity report.
     * 
     * @param {'daily' | 'weekly' | 'yearly'} interval
     * @param {Date} start
     * @returns {string}
     */
    static reportTitle(interval, start) {
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