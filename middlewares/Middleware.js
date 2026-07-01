import Sergey from '#classes/Sergey.js';

export default class Middleware {
    static requiredIntents = [];

    static async init() {
        for (const intent of this.requiredIntents) {
            Sergey.intents.add(intent);
        }
    }

    shouldRun(target) {
        return true;
    }

    async run(target) {
        throw new Error('No run action specified.');
    }
}