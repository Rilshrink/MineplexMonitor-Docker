import CommandManager from './command/command_manager';
import { DatabaseManager } from './database/database';
import RedisManager from './redis/redis';
import DockerManager from './docker/docker';
import { Config } from './utils/config';
import { Webserver } from './webserver/webserver';
import ServerMonitor from './servermonitor/server_monitor';

Config.init();
(async () => {
    await DatabaseManager.init();
    await Webserver.init();
    await RedisManager.init();
    await DockerManager.init();
    await ServerMonitor.init();
    if (!process.env.MM_NO_COMMAND_MANAGER) { // Has issues with headless environments
        await CommandManager.init();
    }
})();
