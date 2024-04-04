import Dockerode, { Container } from 'dockerode' 
import { DockerOptions } from 'dockerode';
import { Config } from '../utils/config';
import Logger from '../utils/log';
import RedisManager from '../redis/redis';
import { MinecraftServer } from '../redis/minecraft_server_data';

export default class DockerManager {

    public static instance: Dockerode;
    public static readonly logger = new Logger('Docker');

    public static async init() {
        DockerManager.instance = new Dockerode({
            socketPath: '/var/run/docker.sock'
        });
    }

    public static async createBungee(serverName: string) {
        this.logger.log(`Fake created bungee with name: ${serverName}`);
    }

    public static async doesServerExist(serverName: string): Promise<boolean> {
        try {
            await DockerManager.instance.getContainer(serverName).inspect();
            return true;
        } catch(err) {
            return false;
        }
    }

    public static async checkServerRunning(serverName: string): Promise<boolean> {
        try {
            const container = DockerManager.instance.getContainer(serverName);
            const info = await container.inspect();
            return info.State.Running;
        } catch(err) {
            return false;
        }
    }

    public static async checkServerHealth(serverName: string): Promise<boolean> {
        try {
            const container = DockerManager.instance.getContainer(serverName);
            const info = await container.inspect();
            return info.State.Health?.Status === 'healthy';
        } catch(err) {
            return false;
        }
    }

    public static async createServer(serverGroup: string, serverName: string) {
        if((await this.doesServerExist(serverName))) {
            this.logger.log(`(${serverName}) Server already exists`);
            return;
        }

        try {
            let group = await RedisManager.getServerGroupByName(serverGroup);

            let s_prefix      = group.prefix;
            let s_addac       = group.addNoCheat;
            let s_portsection = group.portSection;
            let s_lobbyzip    = group.worldZip;
            let s_pluginfile  = group.plugin;
            let s_pluginconfigpath = group.configPath;

            let serverNum: number = parseInt(serverName.split("-")[1]);

            let s_port: number = Number(s_portsection) + Number(serverNum);

            let container = await DockerManager.instance.createContainer({
                name: serverName,
                Image: Config.config.dockerConnection.javaImage,
                HostConfig: {
                    NetworkMode: "host",
                    /*
                    PortBindings: {
                        [`${s_port}/tcp`]: [{ HostPort: `${s_port}` }]
                    },
                    */
                    Mounts: [
                        {
                            Type: 'volume',
                            Source: Config.config.dockerConnection.serverConfigVolume,
                            Target: Config.config.dockerConnection.serverConfigMountPoint,
                            ReadOnly: false,
                        }
                    ]
                },
                Volumes: {
                    [Config.config.dockerConnection.serverConfigMountPoint]: {}
                },
                /*
                ExposedPorts: {
                    [`${s_port}/tcp`]: {}
                },
                */
                Env: [
                    `MINEPLEX_PORT=${s_port}`,
                    `MINEPLEX_PREFIX=${s_prefix}`,
                    `MINEPLEX_SERVER_NAME=${serverName}`,
                    `MINEPLEX_ADD_ANTICHEAT=${s_addac}`,
                    `MINEPLEX_WORLD_ZIP=${s_lobbyzip}`,
                    `MINEPLEX_PLUGIN=${s_pluginfile}`,
                    `MINEPLEX_PLUGIN_CONFIG_PATH=${s_pluginconfigpath}`,
                    //
                    `MINEPLEX_WEB_SERVER_HOST=${Config.config.dockerConnection.webServerHost}`,
                    `MINEPLEX_DATABASE_ADDR=${Config.config.databaseConnection.address}:${Config.config.databaseConnection.port}`,
                    `MINEPLEX_DATABASE_USER=${Config.config.databaseConnection.username}`,
                    `MINEPLEX_DATABASE_PASS=${Config.config.databaseConnection.password}`,
                    // 
                    `MINEPLEX_MOUNT_POINT=${Config.config.dockerConnection.serverConfigMountPoint}`,
                    `MINEPLEX_JARS_PATH=${Config.config.dockerConnection.serverJarsPath}`,
                    `MINEPLEX_LOBBY_PATH=${Config.config.dockerConnection.serverLobbyPath}`,
                    `MINEPLEX_CONFIG_PATH=${Config.config.dockerConnection.serverConfigPath}`,
                    `MINEPLEX_PLUGIN_PATH=${Config.config.dockerConnection.serverPluginPath}`,
                    `MINEPLEX_UPDATE_PATH=${Config.config.dockerConnection.serverFilesPath}` // TO BE SYMLINKED
                ],
                WorkingDir: `${Config.config.dockerConnection.serverSetupScripts}/`,
                Cmd: [`/bin/sh`, `start.sh`]
            });
            await container.start();
            this.logger.log(`(${serverName}) Server created`);
        } catch(err) {
            this.logger.error(`(${serverName}) Failed to create server: ${err}`);
        }
    }

    public static async restartServer(serverName: string) {
        if(!(await this.doesServerExist(serverName))) {
            this.logger.warn(`(${serverName}) Server doesn't exist`);
            return;
        }

        try {
            const container = DockerManager.instance.getContainer(serverName);
            await container.restart();
            this.logger.log(`(${serverName}) Server restarted`);
        } catch(err) {
            this.logger.error(`(${serverName}) Failed to restart: ${err}`);
        }
    }

    public static async removeServer(serverName: string) {
        if(!(await this.doesServerExist(serverName))) {
            this.logger.warn(`(${serverName}) Server doesn't exist`);
            return;
        }

        try {
            const container = DockerManager.instance.getContainer(serverName);
            if(await this.checkServerRunning(serverName)) {
                await container.stop();
            }
            await container.remove();
            this.logger.log(`(${serverName}) Server removed`);
        } catch(err) {
            this.logger.error(`(${serverName}) Failed to remove: ${err}`);
        }
    }

}
