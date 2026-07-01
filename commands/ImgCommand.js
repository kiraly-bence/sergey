import Command from '#/commands/Command.js';
import Utils from '#/classes/Utils.js';
import DuckDuckGo from '@mudbill/duckduckgo-images-api';
import * as Discord from 'discord.js';

export default class ImgCommand extends Command {
    command = new Discord.SlashCommandBuilder()
        .setName('img')
        .setDescription('Show a random image from the internet.')
        .addStringOption(option => 
            option
                .setName('keyword')
                .setDescription('The keyword you want to search for.')
                .setRequired(true)
        );

    async execute(interaction) {
        let keyword = interaction.options.getString('keyword');
        let images = await DuckDuckGo.imageSearch({ query: keyword });

        if (images.length === 0) {
            await interaction.editReply(`No images found with keyword: \`${keyword}\``);
            return;
        }

        let image = Utils.randArr(images.slice(0, 10));

        await interaction.editReply({
            content: `Image keyword: \`${keyword}\``,
            files: [new Discord.AttachmentBuilder(image.image)],
        });
    }
}