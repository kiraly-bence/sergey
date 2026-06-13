import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import duration from 'dayjs/plugin/duration.js';
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);

export default class Formatter {
    static formatTimestamp(timestamp, format = 'YYYY-MM-DD HH:mm:ss') {
        return dayjs(timestamp)
            .tz(process.env.TIMEZONE)
            .format(format);
    }

    static getFileNameFromUrl(url) {
        let result = new RegExp(/(?=\w+\.\w{3,4}$).+/).exec(url);

        return result?.[0];
    }

    static removeAccents(str) {
        return str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
    }

    static removeFormatting(str) {
        const formatters = [
            '*', // italics/bold
            '_', // italics/underline
            '~~', // strikethrough
            '||', // spoiler
            '`', // code blocks
        ];

        const starterFormatters = [
            '>>> ', // block quotes
            '> ', // block quotes
        ];

        for (const formatter of formatters) {
            str = str.replace(new RegExp('\\' + formatter, 'g'), '');
        }

        for (const formatter of starterFormatters) {
            if (str.startsWith(formatter)) {
                str = str.substring(formatter.length, str.length);
            }
        }

        str = str.replace(new RegExp('\\n', 'g'), ' ');

        return str;
    }

    static formatSeconds(seconds) {
        return dayjs.duration(seconds, 'seconds').format('mm:ss');
    }
}