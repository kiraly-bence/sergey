import axios from 'axios';
import Emote from './Emote.js';
import DB from './DB.js';
import Log from './Log.js';
import Sergey from './Sergey.js';
import * as Discord from 'discord.js';
import Formatter from './Formatter.js';

export default class LolTracker {
    static REFRESH_INTERVAL_SECONDS = 120;
    static RECENT_GAME_THRESHOLD_MINUTES = 10;
    
    // Static data by Riot Games
    static QUEUES;

    static ROLES = {
        'TOP': 'top',
        'JUNGLE': 'jungle',
        'MIDDLE': 'mid',
        'BOTTOM': 'adc',
        'UTILITY': 'support',
        'NONE': null,
    };

    static matchCache = new Map();

    /**
     * Initialize League of Legends tracker.
     *
     * @return {Promise<void>}
     */
    static async init() {
        await this.registerStaticData();

        setInterval(async () => {
            try {
                let users = await this.getTrackedUsers();

                for (let user of users) {
                    try {
                        let puuid = await this.getPuuid(user);

                        if (!puuid) {
                            continue;
                        }

                        let match = await this.fetchLatestMatch(user, puuid);

                        if (!match) {
                            continue;
                        }

                        if (await this.isTrackedMatch(match.metadata.matchId, user.id)) {
                            continue;
                        }

                        await this.saveMatch(match, user.id);

                        // Notifications should only be sent if the match ended recently
                        if (Date.now() - match.info.gameEndTimestamp < this.RECENT_GAME_THRESHOLD_MINUTES * 60 * 1000) {
                            await this.sendNotifications(match, puuid);
                        }
                    } catch (err) {
                        Log.error(err);
                    }
                }

                this.matchCache.clear();
            } catch (err) {
                Log.error(err);
            }
        }, this.REFRESH_INTERVAL_SECONDS * 1000);
    }

    /**
     * Return users from the database that should be tracked.
     *
     * @return {Promise<object[]>}
     */
    static async getTrackedUsers() {
        return await DB.query('select * from tracked_lol_users where is_enabled = 1');
    }

    /**
     * Return the latest match from the user's match history.
     *
     * @param {object} user
     * @param {string} puuid
     * @return {Promise<object[]|null>}
     */
    static async fetchLatestMatch(user, puuid) {
        let resp = await axios.get(`https://${user.region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids`, {
            params: {
                start: 0,
                count: 1,
            },
            headers: {
                'X-Riot-Token': process.env.RIOT_API_TOKEN,
            },
        }).catch(err => {
            Log.error(err);
        });

        let matchId = resp?.data?.[0] ?? null;

        if (!matchId) {
            return null;
        }

        if (this.matchCache.has(matchId)) {
            return this.matchCache.get(matchId);
        }

        resp = await axios.get(`https://${user.region}.api.riotgames.com/lol/match/v5/matches/${matchId}`, {
            headers: {
                'X-Riot-Token': process.env.RIOT_API_TOKEN,
            },
        }).catch(err => {
            Log.error(err);
        });

        let match = resp?.data ?? null;

        if (!match) {
            return null;
        }

        this.matchCache.set(matchId, match);

        return match;
    }

    /**
     * Check if a match was already tracked.
     *
     * @param {string} matchId
     * @param {number} userId
     * @return {Promise<boolean>}
     */
    static async isTrackedMatch(matchId, userId) {
        let results = await DB.query('select * from tracked_lol_matches where match_id = :matchId and user_id = :userId', {
            matchId: matchId,
            userId: userId,
        });

        return results.length > 0;
    }

    /**
     * Save an untracked match to the database.
     *
     * @param {object} match
     * @param {number} userId
     * @return {Promise<void>}
     */
    static async saveMatch(match, userId) {
        await DB.query('insert into tracked_lol_matches (match_id, user_id) values (:matchId, :userId)', {
            matchId: match.metadata.matchId,
            userId: userId,
        });
    }

    /**
     * Send notifications about a match.
     *
     * @param {object} match
     * @param {string} puuid
     * @return {Promise<void>}
     */
    static async sendNotifications(match, puuid) {
        let participant = match.info.participants.find(participant => participant.puuid === puuid);

        await this.sendMatchNotification(match, participant);

        if (participant.pentaKills > 0) {
            await this.sendPentakillNotification(participant);
        }
    }

    /**
     * Send a notification about the match.
     *
     * @param {Object} match
     * @param {Object} participant
     * @return {Promise<void>}
     */
    static async sendMatchNotification(match, participant) {
        let result = participant.win
            ? 'won'
            : 'lost';

        let emoji = participant.win
            ? await Emote.get('PogChimp', '😲')
            : await Emote.get('KEKW', '😂');

        let color = participant.win
            ? '00c000'
            : 'd60000';

        let lane = this.ROLES[participant.teamPosition] ?? null;
        let queue = this.QUEUES.find(queue => queue.queueId === match.info.queueId);

        await Sergey.client.channels.cache.get(process.env.LOL_TRACKER_NOTIFICATION_CHANNEL_ID).send({
            content: `${participant.riotIdGameName} just ${result} a LoL game ${emoji}`,
            embeds: [
                new Discord.EmbedBuilder()
                    .setColor(color)
                    .setAuthor({
                        name: participant.championName + (lane ? ` (${lane})` : ''),
                        iconURL: `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${participant.championId}.png`,
                    })
                    .addFields(
                        {
                            name: 'Gamemode',
                            value: `${queue?.description.replace(' games', '')} (${queue?.map})`,
                        },
                        {
                            name: 'Length',
                            value: Formatter.formatDuration(match.info.gameDuration * 1000),
                            inline: true,
                        },
                        {
                            name: 'KDA',
                            value: `${participant.kills}/${participant.deaths}/${participant.assists}`,
                            inline: true,
                        },
                        {
                            name: 'Minions',
                            value: (participant.totalMinionsKilled + participant.neutralMinionsKilled).toString(),
                            inline: true,
                        },
                        {
                            name: 'Gold earned',
                            value: participant.goldEarned.toString(),
                            inline: true,
                        },
                        {
                            name: 'Damage dealt',
                            value: participant.totalDamageDealtToChampions.toString(),
                            inline: true,
                        },
                        {
                            name: 'Minions @ 10 mins',
                            value: (participant.challenges.laneMinionsFirst10Minutes + Math.round(participant.challenges.jungleCsBefore10Minutes)).toString(),
                            inline: true,
                        },
                    ),
            ],
        });
    }

    /**
     * Send a pentakill notification.
     *
     * @param {object} participant
     * @return {Promise<void>}
     */
    static async sendPentakillNotification(participant) {
        let name = participant.riotIdGameName;
        let champ = participant.championName;

        let message = `${name} just did a pentakill with ${champ} ${await Emote.get('PogChimp', '😲')}`;

        await Sergey.client.channels.cache.get(process.env.LOL_TRACKER_NOTIFICATION_CHANNEL_ID).send(message);
    }

    /**
     * Return the Riot PUUID of a user.
     * 
     * @param {object} user
     * @return {Promise<string|null>}
     */
    static async getPuuid(user) {
        if (user.puuid) {
            return user.puuid;
        }

        let resp = await axios.get(`https://${user.region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${user.name}/${user.tag}`, {
            headers: {
                'X-Riot-Token': process.env.RIOT_API_TOKEN,
            },
        }).catch(err => {
            Log.error(err);
        });

        let puuid = resp?.data?.puuid ?? null;

        if (!puuid) {
            return null;
        }

        await DB.query('update tracked_lol_users set puuid = :puuid where id = :id', {
            puuid: puuid,
            id: user.id,
        });

        return puuid;
    }

    /**
     * Fetch static data served by Riot Games.
     * 
     * @return {Promise<void>}
     */
    static async registerStaticData() {
        let resp;

        resp = await axios.get('https://static.developer.riotgames.com/docs/lol/queues.json');
        this.QUEUES = resp.data;
    }
}