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

            let serverNum = parseInt(serverName.split("-")[1]);

            let s_port = s_portsection + serverNum;

            let container = await DockerManager.instance.createContainer({
                name: serverName,
                Image: Config.config.dockerConnection.javaImage,
                HostConfig: {
                    PortBindings: {
                        [`${s_port}/tcp`]: [{ HostPort: `${s_port}` }]
                    },
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
                ExposedPorts: {
                    [`${s_port}/tcp`]: {}
                },
                Env: [
                    `MINEPLEX_PORT=${s_port}`,
                    `MINEPLEX_PREFIX=${s_prefix}`,
                    `MINEPLEX_SERVER_NAME=${serverName}`,
                    `MINEPLEX_ADD_ANTICHEAT=${s_addac}`,
                    `MINEPLEX_WORLD_ZIP=${s_lobbyzip}`,
                    `MINEPLEX_PLUGIN=${s_pluginfile}`,
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
            if(await this.checkServerHealth(serverName)) { // TODO: Better check
                await container.stop();
            }
            await container.remove();
            this.logger.log(`(${serverName}) Server removed`);
        } catch(err) {
            this.logger.error(`(${serverName}) Failed to remove: ${err}`);
        }
    }

}