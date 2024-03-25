import CommandManager from './command/command_manager';
import { DatabaseManager } from './database/database';
import RedisManager from './redis/redis';
import { Config } from './utils/config';
import { Webserver } from './webserver/webserver';

Config.init();
(async () => {
    await DatabaseManager.init();
    await Webserver.init();
    await RedisManager.init();
    if (!process.env.MM_NO_COMMAND_MANAGER) { // Has issues with headless environments
        await CommandManager.init();
    }
})();
