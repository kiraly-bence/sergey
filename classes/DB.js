import * as mysql from 'mysql2/promise';

export default class DB {
    static connection;

    static async init() {
        this.connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            namedPlaceholders: true,
        });

        await this.query('set names utf8mb4');
        await this.query(`set sql_mode=(select replace(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''))`);
    }

    static async query(statement, params = null) {
        const [rows, fields] = await this.connection.execute(statement, params);

        return rows;
    }

    static async first(statement, params = null) {
        return (await this.query(statement, params))[0] || null;
    }
}