import * as dotenv from 'dotenv';
import Sergey from '#classes/Sergey.js';

// Parse .env variables
dotenv.config();

// Start the bot
await Sergey.init();