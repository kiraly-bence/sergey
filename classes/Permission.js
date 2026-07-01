import DB from '#classes/DB.js';
import Sergey from '#classes/Sergey.js';
import * as Discord from 'discord.js';

export default class Permission {
    /**
     * Get all permissions of a user.
     *
     * @param {string} userId
     * @return {Promise<string[]>}
     */
    static async getUserPermissions(userId) {
        let userPermissions = await DB.query(`
            select permission
            from user_permissions
            where user_id = :user_id
        `, {
            user_id: userId,
        });

        return userPermissions.map(permission => permission.permission);
    }

    /**
     * Check if a user has all the required permissions.
     *
     * @param {string} userId
     * @param {string[]} requiredPermissions
     * @return {Promise<boolean>}
     */
    static async checkUserPermissions(userId, requiredPermissions) {
        if (requiredPermissions.length === 0) {
            return true;
        }

        let userPermissions = await this.getUserPermissions(userId);

        return requiredPermissions.every(permission => userPermissions.includes(permission));
    }
}