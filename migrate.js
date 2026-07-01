import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import Log from '#classes/Log.js';
import DB from '#classes/DB.js';

// Parse .env variables
dotenv.config();

// Initialize the logger
await Log.init();

// Initialize the DB connection
await DB.init();

Log.console('Migrating the database...');

const queries = fs.readFileSync('sergey.sql', 'utf8')
    .split(';')
    .filter(query => query.trim());

await DB.connection.beginTransaction();

try {
    for (const query of queries) {
        await DB.query(query);
    }
} catch (err) {
    await DB.connection.rollback();
    Log.error(err);
    process.exit(1);
}

await DB.connection.commit();

Log.console('Successfully migrated the database.');
process.exit();