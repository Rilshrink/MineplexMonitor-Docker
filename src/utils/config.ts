import fs from 'fs';
import path from 'path';
import Logger from './log';

export class Config {
    private static logger = new Logger('Config');

    //private static _configPath = path.join(__dirname, '../..', 'config.json');

    static config: ConfigType = Config.getDefaultConfig();

    static init() {
        this.logger.log('Loading config');
        /*
        if (fs.existsSync(this._configPath)) {
            this.config = JSON.parse(fs.readFileSync(this._configPath, 'utf-8'));
        } else {
            this.createDefaultConfigFile();
        }
        */
    }

    private static createDefaultConfigFile() {
        this.logger.log('Config file not found! Create new config file.');
        fs.writeFileSync(this._configPath, JSON.stringify(this.getDefaultConfig(), null, 4));
    }

    private static getDefaultConfig(): ConfigType {
        return {
            databaseConnection: {
                address: process.env.MM_MYSQL_ADDR ? process.env.MM_MYSQL_ADDR : '127.0.0.1',
                port: process.env.MM_MYSQL_PORT ? Number(process.env.MM_MYSQL_PORT) : 3306,
                username: process.env.MM_MYSQL_USER ? process.env.MM_MYSQL_USER :'root',
                password: process.env.MM_MYSQL_PASSWORD ? process.env.MM_MYSQL_PASSWORD :'root'
            },
            redisConnection: {
                address: process.env.MM_REDIS_ADDR ? process.env.MM_REDIS_ADDR : '127.0.0.1',
                port: process.env.MM_REDIS_PORT ? Number(process.env.MM_REDIS_PORT) : 6379
            },
            webserver: {
                listenPort: process.env.MM_WEB_PORT ? Number(process.env.MM_WEB_PORT) : 1000
            }
        };
    }
}

export type ConfigType = {
    databaseConnection: {
        address: string;
        port: number;
        username: string;
        password: string;
    };
    redisConnection: {
        address: string;
        port: number;
    };
    webserver: {
        listenPort: number;
    };
};
