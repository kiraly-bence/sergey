import Sergey from '#/classes/Sergey.js';
import * as Discord from 'discord.js';

export default class Utils {
    /**
     * Generate a random number.
     *
     * @param {number} min Inclusive
     * @param {number} max Inclusive
     * @return {number}
     */
    static rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Get a random element from an array.
     *
     * @param {Array} arr
     * @return {*}
     */
    static randArr(arr) {
        if (arr.length === 0) {
            return null;
        }

        return arr[this.rand(0, arr.length - 1)];
    }

    /**
     * Get the channel instance with the given channel ID.
     * 
     * @param {string} channelId 
     * @return {Discord.Channel|null}
     */
    static getChannel(channelId) {
        for (const guild of Sergey.client.guilds.cache.values()) {
            const channel = guild.channels.cache.get(channelId);
    
            if (channel) {
                return channel;
            }
        }

        return null;
    }

    /**
     * Get the member instance with the given member ID.
     * 
     * @param {string} guildId
     * @param {string} memberId
     * @return {Discord.GuildMember|null}
     */
    static async getMember(guildId, memberId) {
        let guild = Sergey.client.guilds.cache.get(guildId);

        if (!guild) {
            return null;
        }
            
        try {
            return await guild.members.fetch(memberId);
        } catch (err) {
            // "Unknown Member" error, happens if the member is no longer in the server
            if (err.code === 10007 || err.code === 10013) {
                return null;
            } else {
                throw err;
            }
        }
    }
}