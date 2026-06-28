import cron from 'node-cron';
import Discord from 'discord.js';
import DB from './DB.js';
import Sergey from './Sergey.js';
import VoiceActivityDailyAverageChart from '../charts/VoiceActivity/VoiceActivityDailyAverageChart.js';
import VoiceActivityWeeklyAverageChart from '../charts/VoiceActivity/VoiceActivityWeeklyAverageChart.js';
import VoiceActivityYearlyAverageChart from '../charts/VoiceActivity/VoiceActivityYearlyAverageChart.js';

/**
 * Responsible for sending automated reports of voice activity on the server.
 */
export default class VoiceActivityReporter {
    static init() {
        // Daily report - every day at 0:00
        cron.schedule('0 0 * * *', async () => await this.sendDailyReports());

        // Weekly report - every monday at 0:00
        cron.schedule('0 0 * * 1', async () => await this.sendWeeklyReports());

        // Yearly report - every jan 1 at 0:00
        cron.schedule('0 0 1 1 *', async () => await this.sendYearlyReports());
    }

    static async sendDailyReports() {
        const now = new Date();
        
        const start = new Date(now);
        start.setDate(now.getDate() - 1); // previous day
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(now);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);

        await this.sendReports('daily', start, end);
    }

    static async sendWeeklyReports() {
        const now = new Date();
        
        const dayOfWeek = (now.getDay() + 6) % 7; // 0 = monday
        
        const end = new Date(now);
        end.setDate(now.getDate() - dayOfWeek - 1); // previous sunday
        end.setHours(23, 59, 59, 999);
        
        const start = new Date(end);
        start.setDate(end.getDate() - 6); // previous monday
        start.setHours(0, 0, 0, 0);

        await this.sendReports('weekly', start, end);
    }

    static async sendYearlyReports() {
        const now = new Date();
        const previousYear = now.getFullYear() - 1;
        
        const start = new Date(previousYear, 0, 1, 0, 0, 0, 0);
        const end = new Date(previousYear, 11, 31, 23, 59, 59, 999);

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
        const voiceActivities = await DB.query(`
            select *
            from voice_activities
            where guild_id = :guild_id
            and timestamp between :start and :end
            order by timestamp
        `, {
            guild_id: guildId,
            start: start,
            end: end,
        });

        if (voiceActivities.length === 0) {
            return;
        }

        const charts = {
            daily: VoiceActivityDailyAverageChart,
            weekly: VoiceActivityWeeklyAverageChart,
            yearly: VoiceActivityYearlyAverageChart,
        };

        const guild = await Sergey.client.guilds.fetch(guildId);
        const channel = await guild.channels.fetch(channelId);
        const pngBuffer = await charts[interval].generate(voiceActivities, guild.name, interval, 'average');

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