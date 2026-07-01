import CommandMiddleware from '#/middlewares/command/CommandMiddleware.js';
import DB from '#/classes/DB.js';

export default class LogCommandUsageToDatabase extends CommandMiddleware {
    async run(interaction) {
        await DB.query(`
            insert into command_logs (
                command,
                options,
                user_id,
                channel_id,
                guild_id,
                used_at
            ) values (
                :command,
                :options,
                :userId,
                :channelId,
                :guildId,
                :usedAt
            )
        `, {
            command: interaction.commandName,
            options: this.formatOptions(interaction),
            userId: interaction.user.id,
            channelId: interaction.channel.id,
            guildId: interaction.guild.id,
            usedAt: new Date(interaction.createdTimestamp),
        });
    }

    formatOptions(interaction) {
        if (interaction.options.data.length === 0) {
            return null;
        }

        let options = {};

        for (const option of interaction.options.data) {
            options[option.name] = option.value;
        }

        return JSON.stringify(options);
    }
}