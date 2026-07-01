import schedule from 'node-schedule';
import DB from '#classes/DB.js';
import Log from '#classes/Log.js';
import Sergey from '#classes/Sergey.js';
import * as Discord from 'discord.js';

export default class MessageScheduler {
    static REFRESH_INTERVAL_SECONDS = 10;
    static scheduledMessages = {};
    static scheduledJobs = {};

    static async init() {
        setInterval(async () => {
            try {
                let messages = await DB.query('select * from scheduled_messages where is_enabled = 1');

                for (let message of messages) {
                    let isRegistered = this.isRegistered(message);
                    let isChanged = this.isChanged(message);

                    if (!isRegistered || isChanged) {
                        if (isRegistered && isChanged) {
                            this.clearJob(message.id);
                        }

                        this.scheduleMessage(message);
                    }
                }
            } catch (err) {
                Log.error(err);
            }
        }, this.REFRESH_INTERVAL_SECONDS * 1000);
    }

    static scheduleMessage(message) {
        this.scheduledJobs[message.id] = schedule.scheduleJob(message.cron, async () => {
            try {
                await Sergey.client.channels.cache.get(message.channel_id).send({
                    content: message.message,
                    files: message.embed ? [new Discord.AttachmentBuilder(message.embed)] : [],
                });
            } catch (err) {
                Log.error(err);
            }
        });

        this.scheduledMessages[message.id] = message;
    }

    static isRegistered(message) {
        return typeof this.scheduledMessages[message.id] !== 'undefined';
    }

    static isChanged(message) {
        return JSON.stringify(this.scheduledMessages[message.id]) !== JSON.stringify(message);
    }

    static clearJob(id) {
        this.scheduledJobs[id].cancel();
        delete this.scheduledJobs[id];
    }
}