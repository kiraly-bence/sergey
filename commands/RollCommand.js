import Command from './Command.js';
import Emote from '../classes/Emote.js';
import DB from '../classes/DB.js';
import Utils from '../classes/Utils.js';
import * as Discord from 'discord.js';

export default class RollCommand extends Command {
    command = new Discord.SlashCommandBuilder()
        .setName('roll')
        .setDescription('Gamble against the bot.')
        .addIntegerOption(option =>
            option
                .setName('max')
                .setDescription('The maximum number to be rolled.')
                .setMinValue(1)
                .setMaxValue(Number.MAX_SAFE_INTEGER)
        );

    async execute(interaction) {
        let max = interaction.options.getInteger('max') ?? 100;
        let botPoints = Utils.rand(1, max);
        let userPoints = await this.userPoints(interaction.user.id, botPoints, max);
        let result;

        if (userPoints < botPoints) {
            result = `Winner: Sergey ${await Emote.get('KEKWDISCO', '😎')}`;
        } else if (userPoints > botPoints) {
            result = `Winner: ${interaction.user.globalName} ${await Emote.get('KEKWait', '😡')}`;
        } else if (userPoints === botPoints) {
            result = await Emote.get('4Weird', '⚖️');
        } else {
            result = 'This message should never be visible.';
        }

        await interaction.editReply(`${interaction.user.globalName}: ${userPoints}\nSergey: ${botPoints}\n\n${result}`);
    }

    async userPoints(userId, botPoints, max) {
        let rigging = await DB.first('select * from roll_riggings where user_id = :userId limit 1', { userId: userId });

        if (!rigging) {
            return Utils.rand(1, max);
        }

        switch (rigging.type) {
            case 'W':
                return Utils.rand(
                    botPoints + 1,
                    Math.max(max, botPoints + 1),
                );
            
            case 'L':
                return Utils.rand(
                    Math.min(1, botPoints - 1),
                    botPoints - 1,
                );

            case 'D':
                return botPoints;

            default:
                throw new Error(`Rigging exists, but type wasn't recognized (${rigging.type}).`);
        }
    }
}