import DB from '#/classes/DB.js';

export default class Emote {
    static async get(name, fallback = null) {
        return (await DB.first('select * from emotes where name = :name limit 1', { name: name }))?.tag ?? fallback;
    }
}