import axios from 'axios';
import Emote from './Emote.js';
import DB from './DB.js';
import Log from './Log.js';
import Sergey from './Sergey.js';
import * as Discord from 'discord.js';
import Formatter from './Formatter.js';

export default class VoiceActivityTracker {
    /**
     * Initialize voice activity tracker.
     *
     * @return {Promise<void>}
     */
    static async init() {
        Sergey.client.on(Discord.Events.VoiceStateUpdate, async (oldState, newState) => {
            const userId = newState.member.id ?? oldState.member.id;
            const guildId = newState.guild.id ?? oldState.guild.id;
            const timestamp = new Date();

            if (oldState.channel && oldState.channel.id !== oldState.guild.afkChannelId) {
                await this.logVoiceActivity(userId, guildId, oldState.channel.id, 'leave', timestamp);
            }

            if (newState.channel && newState.channel.id !== newState.guild.afkChannelId) {
                await this.logVoiceActivity(userId, guildId, newState.channel.id, 'join', timestamp);
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
}