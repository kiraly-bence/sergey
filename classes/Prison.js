import * as Discord from 'discord.js';
import DB from './DB.js';
import Sergey from './Sergey.js';

export default class Prison {
    static async init() {
        Sergey.listeners.push({
            event: Discord.Events.VoiceStateUpdate,
            listener: async (oldState, newState) => {
                // If the user disconnected from voice channels, we can't move him
                if (!newState.channel) {
                    return;
                }

                await Prison.moveUserToPrisonVoiceChannel(newState.member, newState.guild, newState.channel);
            },
        });
    }

    /**
     * Add a prison rule for a user.
     *
     * @param {string} userId
     * @param {string} guildId
     * @param {string} voiceChannelId
     * @param {Date} expiresAt
     * @return {Promise<void>}
     */
    static async addPrisonRule(userId, guildId, voiceChannelId, expiresAt) {
        // TODO: ezt tranzakcióban kéne (meg utána kéne nézni, hogy hol máshol kellhet még tranzakció)

        // If the user is already prisoned, we free them first
        await this.freeUser(userId, guildId);

        // Then we prison them again with the new voice channel
        await DB.query(`
            insert into prisoned_users (
                user_id,
                guild_id,
                voice_channel_id,
                expires_at
            ) values (
                :user_id,
                :guild_id,
                :voice_channel_id,
                :expires_at
            )
        `, {
            user_id: userId,
            guild_id: guildId,
            voice_channel_id: voiceChannelId,
            expires_at: expiresAt,
        });
    }

    /**
     * Free a user from prison.
     *
     * @param {string} userId
     * @param {string} guildId
     * @return {Promise<void>}
     */
    static async freeUser(userId, guildId) {
        await DB.query(`
            update prisoned_users
            set cancelled_at = now()
            where user_id = :user_id
            and guild_id = :guild_id
            and (expires_at is null or expires_at > now())
            and cancelled_at is null
        `, {
            user_id: userId,
            guild_id: guildId,
        });
    }

    /**
     * Get the prison rule for a user.
     *
     * @param {string} userId
     * @param {string} guildId
     * @param {string} currentVoiceChannelId
     * @return {Promise<object|null>}
     */
    static async getPrisonRule(userId, guildId, currentVoiceChannelId) {
        return await DB.first(`
            select *
            from prisoned_users
            where user_id = :user_id
            and guild_id = :guild_id
            and voice_channel_id <> :voice_channel_id
            and (expires_at is null or expires_at > now())
            and cancelled_at is null
            limit 1
        `, {
            user_id: userId,
            guild_id: guildId,
            voice_channel_id: currentVoiceChannelId,
        });
    }

    /**
     * Move a user to the prison channel.
     *
     * @param {Discord.GuildMember} member
     * @param {Discord.Guild} guild
     * @param {Discord.VoiceChannel} currentVoiceChannel
     * @return {Promise<void>}
     */
    static async moveUserToPrisonVoiceChannel(member, guild, currentVoiceChannel) {
        let prisonRule = await this.getPrisonRule(member.id, guild.id, currentVoiceChannel.id);

        if (!prisonRule) {
            return;
        }

        await member.voice.setChannel(prisonRule.voice_channel_id);
    }
}