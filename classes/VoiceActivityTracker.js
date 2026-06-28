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
            // const activities = await DB.query(`
            //     SELECT * FROM voice_activities
            //     ORDER BY timestamp ASC
            // `);

            // const sessions = VoiceActivity.buildSessions_migrate(activities);

            // for (const session of sessions) {
            //     await DB.query(`
            //         INSERT INTO voice_sessions (user_id, guild_id, voice_channel_id, joined_at, left_at)
            //         VALUES (:user_id, :guild_id, :voice_channel_id, :join, :leave)
            //     `, session);
            // }
            
            const user = newState.member ?? oldState.member;
            const guild = newState.guild ?? oldState.guild;
            const timestamp = new Date();

            if (oldState.channel && oldState.channel.id !== oldState.guild.afkChannelId) {
                await this.logVoiceActivity(user.id, guild.id, oldState.channel.id, 'leave', timestamp);
                await this.logVoiceActivity_session(user.id, guild.id, oldState.channel.id, 'leave', timestamp);
                await this.logToConsole(guild, oldState.channel, user, 'leave');
            }

            if (newState.channel && newState.channel.id !== newState.guild.afkChannelId) {
                await this.logVoiceActivity(user.id, guild.id, newState.channel.id, 'join', timestamp);
                await this.logVoiceActivity_session(user.id, guild.id, newState.channel.id, 'join', timestamp);
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

    // TODO: párhuzamosan a mostani voice_activities táblával, el kéne kezdeni menteni egy voice_sessions táblát is
    // azért, hogy már most el tudjak kezdeni vele dolgozni, és ne utólag kelljen migrálgatni

    /**
     * Logs voice activity for a user as a session.
     *
     * @param {string} userId
     * @param {string} guildId
     * @param {string} voiceChannelId
     * @param {'join' | 'leave'} type
     * @param {Date} timestamp
     * @return {Promise<void>}
     */
    static async logVoiceActivity_session(userId, guildId, voiceChannelId, type, timestamp) {
        // Look for previous ongoing sessions
        const ongoingSessions = await DB.query(`
            select id, joined_at
            from voice_sessions
            where user_id = :user_id
            and guild_id = :guild_id
            and left_at is null
            order by joined_at
        `, {
            user_id: userId,
            guild_id: guildId,
        });

        if (type === 'join') {
            // If there are any ongoing sessions found, that means there's a data error, and we should delete them
            if (ongoingSessions.length > 0) {
                const ids = ongoingSessions.map(r => r.id);

                await DB.query(`
                    delete from voice_sessions
                    where id in (:ids)
                `, {
                    ids: ids,
                });
            }

            // Insert the new session
            await DB.query(`
                insert into voice_sessions (
                    user_id,
                    guild_id,
                    voice_channel_id,
                    joined_at
                ) values (
                    :user_id,
                    :guild_id,
                    :voice_channel_id,
                    :joined_at
                )
            `, {
                user_id: userId,
                guild_id: guildId,
                voice_channel_id: voiceChannelId,
                joined_at: timestamp,
            });
        } else if (type === 'leave') {
            // If there are no ongoing sessions found, we can't attach the leave to anything
            if (ongoingSessions.length === 0) {
                return;
            }

            // If there are multiple ongoing sessions found, that means there's a data error, and we should keep only the last one
            if (ongoingSessions.length > 1) {
                const ids = ongoingSessions.slice(0, -1).map(r => r.id);

                await DB.query(`
                    delete from voice_sessions
                    where id in (:ids)
                `, {
                    ids: ids,
                });
            }

            // This is the valid ongoing session
            const sessionToClose = ongoingSessions[ongoingSessions.length - 1];

            // If for some reason the leave timestamp is earlier than the join timestamp, that means there's a data error, and we should delete the ongoing session + skip logging the leave
            if (sessionToClose.join && sessionToClose.join >= timestamp) {
                await DB.query(`
                    delete from voice_sessions
                    where id = :id
                `, {
                    id: sessionToClose.id,
                });

                return;
            }

            // Close the ongoing session
            await DB.query(`
                update voice_sessions
                set left_at = :left_at
                where id  = :id
            `, {
                left_at: timestamp,
                id: sessionToClose.id,
            });
        } else {
            throw new Error(`Invalid voice activity type: ${type}`);
        }
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