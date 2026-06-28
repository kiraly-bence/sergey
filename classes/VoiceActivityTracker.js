import DB from './DB.js';
import Formatter from './Formatter.js';
import Log from './Log.js';
import Sergey from './Sergey.js';
import * as Discord from 'discord.js';
import VoiceActivity from './VoiceActivity.js';

/**
 * Responsible for tracking voice activity.
 */
export default class VoiceActivityTracker {
    /**
     * Initialize voice activity tracker.
     *
     * @return {Promise<void>}
     */
    static async init() {
        Sergey.client.on(Discord.Events.VoiceStateUpdate, async (oldState, newState) => {
            const user = newState.member ?? oldState.member;
            const guild = newState.guild ?? oldState.guild;
            const timestamp = new Date();

            if (oldState.channel && oldState.channel.id !== oldState.guild.afkChannelId) {
                await this.logVoiceActivity(user.id, guild.id, oldState.channel.id, 'leave', timestamp);
                await this.logToConsole(guild, oldState.channel, user, 'leave');
            }

            if (newState.channel && newState.channel.id !== newState.guild.afkChannelId) {
                await this.logVoiceActivity(user.id, guild.id, newState.channel.id, 'join', timestamp);
                await this.logToConsole(guild, newState.channel, user, 'join');
            }
        });
    }

    /**
     * Logs voice activity for a user.
     *
     * @param {string} userId
     * @param {string} guildId
     * @param {string} voiceChannelId
     * @param {'join' | 'leave'} type
     * @param {Date} timestamp
     * @return {Promise<void>}
     */
    static async logVoiceActivity(userId, guildId, voiceChannelId, type, timestamp) {
        await DB.query(`
            insert into voice_activities (
                user_id,
                guild_id,
                voice_channel_id,
                type,
                timestamp
            ) values (
                :user_id,
                :guild_id,
                :voice_channel_id,
                :type,
                :timestamp
            )
        `, {
            user_id: userId,
            guild_id: guildId,
            voice_channel_id: voiceChannelId,
            type: type,
            timestamp: timestamp,
        });
    }

    /**
     * Log a voice activity to the console.
     * 
     * @param {Discord.Guild} guild
     * @param {Discord.VoiceBasedChannel} channel
     * @param {Discord.GuildMember} user
     * @param {'join' | 'leave'} type
     * @returns {void}
     */
    static async logToConsole(guild, channel, user, type) {
        let breadcrumbs = [guild.name, '🔊 ' + channel.name, user.displayName];
        let text = `${breadcrumbs.join(' > ')}`;

        switch (type) {
            case 'join':
                text += ' has joined the voice channel.';
                break;

            case 'leave':
                let lastSession = await VoiceActivity.getLastSession(user.id, guild.id);
                let timeSpent = Formatter.formatDuration(lastSession.length);
                text += ` has left the voice channel (time spent: ${timeSpent}).`;
                break;

            default:
                throw new Error(`Invalid voice activity type: ${type}`);
        }

        Log.console(text);
    }
}