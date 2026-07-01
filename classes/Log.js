import Formatter from '#/classes/Formatter.js';
import winston from 'winston';
import 'winston-daily-rotate-file';

export default class Log {
    static fileLogger;

    static async init() {
        this.fileLogger = winston.createLogger({
            format: winston.format.combine(
                winston.format.timestamp({
                    format: Formatter.formatTimestamp,
                }),
                winston.format.printf(({ timestamp, level, message }) => {
                    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
                }),
            ),
            transports: [
                new winston.transports.DailyRotateFile({
                    filename: 'logs/%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                }),
            ],
        });
    }

    /**
     * Log a text to a log file.
     *
     * @param {string} level
     * @param {string} text
     * @return {void}
     */
    static file(level, text) {
        this.fileLogger.log({
            level: level,
            message: text,
        });
    }

    /**
     * Log an error.
     *
     * @param {Error} err
     * @return {void}
     */
    static error(err) {
        let errorMessage = err.stack || err.message || err;

        this.console(errorMessage);
        this.file('error', errorMessage);
    }

    /**
     * Log a text to the console.
     *
     * @param {string} text
     * @return {void}
     */
    static console(text) {
        let timestamp = Formatter.formatTimestamp(new Date());

        console.log(`[${timestamp}] ${text}`);
    }
}