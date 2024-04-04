import fs from 'fs';
import path from 'path';
import Logger from './log';

export class Config {
    private static logger = new Logger('Config');

    private static _configPath = path.join(__dirname, '../..', 'config.json');

    static config: ConfigType = Config.getDefaultConfig();

    static init() {
        this.logger.log('Loading config');

        if(process.env.MM_CONFIG_LOAD_CONFIG_FILE) {
            if (fs.existsSync(this._configPath)) {
                this.config = JSON.parse(fs.readFileSync(this._configPath, 'utf-8'));
            } else {
                this.createDefaultConfigFile();
            }
        }
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
            dockerConnection: {
                javaImage: process.env.MM_DOCKER_IMAGE ? process.env.MM_DOCKER_IMAGE : 'openjdk:8',
                serverConfigVolume: process.env.MM_DOCKER_CONFIG_VOLUME ? process.env.MM_DOCKER_CONFIG_VOLUME : "mineplex_data",
                serverConfigMountPoint: process.env.MM_DOCKER_CONFIG_MOUNT_POINT ? process.env.MM_DOCKER_CONFIG_MOUNT_POINT : "/data",
                serverSetupScripts: process.env.MM_DOCKER_SCRIPTS_PATH ? process.env.MM_DOCKER_SCRIPTS_PATH : '/data/mineplex/scripts',
                serverJarsPath: process.env.MM_DOCKER_JARS_PATH ? process.env.MM_DOCKER_JARS_PATH : '/data/mineplex/jars',
                serverLobbyPath: process.env.MM_DOCKER_LOBBY_MAP_PATH ? process.env.MM_DOCKER_LOBBY_MAP_PATH  : '/data/mineplex/maps',
                serverConfigPath: process.env.MM_DOCKER_CONFIG_PATH ? process.env.MM_DOCKER_CONFIG_PATH : '/data/mineplex/configs',
                serverPluginPath: process.env.MM_DOCKER_PLUGIN_PATH ? process.env.MM_DOCKER_PLUGIN_PATH : '/data/mineplex/plugins',
                serverFilesPath: process.env.MM_DOCKER_GAME_DATA_PATH ? process.env.MM_DOCKER_GAME_DATA_PATH :'/data/mineplex/update'
            },
            serverMonitor: {
                serverAutoCreate: process.env.MM_MONITOR_AUTO_CREATE ? process.env.MM_MONITOR_AUTO_CREATE.toLowerCase() == "true" : true,
                mpsAutoCreate: process.env.MM_MONITOR_MPS_AUTO_CREATE ? process.env.MM_MONITOR_MPS_AUTO_CREATE.toLowerCase() == "true" : true,
                lobbyMinimumAvailableSlots: process.env.MM_MONITOR_LOBBY_MIN_SLOTS ? Number(process.env.MM_MONITOR_LOBBY_MIN_SLOTS) : 50,
            },
            dashboard: {
                listenPort: process.env.MM_DASHBOARD_PORT ? Number(process.env.MM_DASHBOARD_PORT) : 80
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
    // Since everything will be symlinked the plugins and most config files will only have to be changed ONCE and then the servers will need to be restarted of course
    dockerConnection: {
        javaImage: string; // openjdk-8 or any java image essentially, you can even create your own :)
        serverConfigVolume: string; // Where all server files are saved, so that way every container can share the same volume :)
        serverConfigMountPoint: string; // 
        serverSetupScripts: string; // These will be provided on the github just place them in the folder
        serverJarsPath: string; // spigot.jar path, as well as bungeecord.jar or if you're using waterfall.jar
        serverLobbyPath: string; // Server lobby maps, Lobby_MPS.zip, as an example, these need to be pre-parsed
        serverConfigPath: string; // Config files such as redis-config.dat, api-config.dat, spigot.yml and such will be auto-generated
        serverPluginPath: string; // Plugins, Hub.jar, Arcade.jar, Anticheat.jar, etc; this will be symlinked
        serverFilesPath: string; // Your game maps and google drive stuff, this will be symlinked
    };
    serverMonitor: {
        serverAutoCreate: boolean; // This will start up the server monitor service and 
        mpsAutoCreate: boolean; // Whether auto create mineplex player servers
        lobbyMinimumAvailableSlots: number; // Minimum needed slots for a range of lobby servers
    };
    dashboard: { // WIP, but will have the ability to create servers + servergroups and modify player ranks and such from a clean admin dashboard
        listenPort: number;
    }
    redisConnection: {
        address: string;
        port: number;
    };
    webserver: {
        listenPort: number;
    };
};
