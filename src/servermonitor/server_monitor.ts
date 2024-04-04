import RedisManager from '../redis/redis';
import DockerManager from '../docker/docker';
import { MinecraftServer } from '../redis/minecraft_server_data';
import Logger from '../utils/log';
import { ServerGroup } from '../redis/server_group';
import { Config } from '../utils/config';

export enum ServerKilledReason {
    Empty = "Empty",
    Finished = "Finished",
    Cleanup = "Cleanup",
    SlowStartup = "Slow Startup",
    Duplicate = "Duplicate",
    Excess = "Excess",
    Dead = "Dead"
}

export enum ServerRestartReason {
    Laggy = "Laggy",
}

export enum OnlineServerStatus {
    Starting = "Starting",
    Online = "Online",
    Restarting = "Restarting",
    Killed = "Killed",
}

function sleep(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

export default class ServerMonitor {

    public static readonly logger: Logger = new Logger('ServerMonitor');

    private static killServerList: Map<string, ServerKilledReason> = new Map<string, ServerKilledReason>();
    private static laggyServerList: Map<string, ServerRestartReason> = new Map<string, ServerRestartReason>();
    private static serverTracker: Map<string, OnlineServerStatus> = new Map<string, OnlineServerStatus>(); 

    public static async init() {
        // Remove all hanging MPS / Community Servers

        const serverGroups = await RedisManager.instance.smembers('servergroups');

        serverGroups.forEach(async (serverGroup: string) => {
            let group = await RedisManager.getServerGroupByName(serverGroup);

            if(group == undefined || group.serverType == undefined) {
                this.logger.warn(`(${serverGroup}) Dead server group`);
                return;
            }
            
            if(group.serverType.toLowerCase() == "player" ||
               group.serverType.toLowerCase() == "community") {
                await RedisManager.removeServerGroup(group);
                this.logger.log(`Removed server group: ${group.name}`);
            }
        });

        /*
        // Cleanup servers
        const serverStatuses: Map<string, MinecraftServer> = await RedisManager.getServerStatuses();
        serverStatuses.forEach((server: MinecraftServer, key: string) => {
            RedisManager.removeServer(server); 
        });
        */

        await this.loop();
    }

    public static async loop() {
        let checkServerUptime = (server: MinecraftServer) => {
            return ((Date.now()) / 1000) - parseInt(server._startUpDate) as number;
        };

        let checkServerEmpty = (server: MinecraftServer) => {
            return (server._playerCount == 0) as boolean;
        };
        
        let checkServerJoinable = (server: MinecraftServer) => {
            let motd = server._motd.toLowerCase();
            if((motd === "" || motd === "voting" || motd === "starting" || motd === "waiting" || motd === "always_open") && 
               server._playerCount < server._maxPlayerCount) {
                let slots = server._maxPlayerCount - server._playerCount;
                return ((motd !== "") || (slots > 20)) as boolean;
            }
            return false;
        };

        let ignoreServer = (serverGroup: string) => {
            return serverGroup.toLowerCase() === "clans" || serverGroup.toLowerCase() === "testing";
        };

        while(true) {
            let totalPlayers: number = 0;
            let totalServers: number = 0;
            const serverStatuses: Map<string, MinecraftServer> = await RedisManager.getServerStatuses();

            serverStatuses.forEach((server: MinecraftServer, key: string) => {
                let serverName = server._name;
                totalPlayers += server._playerCount;
                totalServers += 1;

                if(this.killServerList.has(serverName) || this.laggyServerList.has(serverName)) {
                    return; // Server is waiting to be killed or restarted
                }

                if(server._motd.toLowerCase().includes("starting")) {
                    return;
                }

                if(!ignoreServer(server._group)) {
                    if(server._motd.toLowerCase().includes("finished") || 
                      (server._group.toLowerCase() == "ultrahardcore" && 
                       server._motd.toLowerCase().includes("restarting") 
                        && server._playerCount == 0)) {
                        this.killServerList.set(serverName, ServerKilledReason.Finished);
                        this.serverTracker.set(serverName, OnlineServerStatus.Killed);
                        return;
                    }
                }

                if(server._tps <= 17) {
                    if(server._tps <= 10) {
                        if(!this.laggyServerList.has(serverName)) {
                            this.laggyServerList.set(serverName, ServerRestartReason.Laggy);
                            this.serverTracker.set(serverName, OnlineServerStatus.Restarting);
                        }
                    } else {
                        this.logger.warn(`(${server._name}) Running poorly at ${server._tps} TPS`);
                    }
                }

                // If time hasn't updated for 35 seconds just assume it's dead :/
                if((Date.now()) - parseInt(server._currentTime) > 35000) {
                    this.killServerList.set(serverName, ServerKilledReason.Dead);
                }

                this.serverTracker.set(key, OnlineServerStatus.Online);
            });

            //this.logger.log(`${totalPlayers} player(s) playing across ${totalServers} servers`);

            this.laggyServerList.forEach(async (reason: ServerRestartReason, serverName: string) => {
                await DockerManager.restartServer(serverName);
                this.laggyServerList.delete(serverName);
                this.logger.log(`(${serverName}) Restarted for: ${reason}`); 
            });
            
            this.killServerList.forEach(async (reason: ServerKilledReason, serverName: string) => {
                await DockerManager.removeServer(serverName); // Remove from docker
                await RedisManager.removeServer(serverName); // Remove from server status
                this.killServerList.delete(serverName);
                this.logger.log(`(${serverName}) Killed for: ${reason}`);
            });

            const serverGroups = await RedisManager.instance.smembers('servergroups');
            serverGroups.forEach(async (serverGroup: string) => {
                let group = await RedisManager.getServerGroupByName(serverGroup);
                
                let requiredTotal = group.requiredTotalServers;
                let requiredJoinable = group.requiredJoinableServers;
                let joinableServers = 0;
                let serverCount = 0;
                let emptyServers = 0;
                let playerCount = 0;

                let _emptyServers: MinecraftServer[] = [];
                let _allServers: Map<string, MinecraftServer> = new Map<string, MinecraftServer>();

                serverStatuses.forEach(async (server: MinecraftServer, key: string) => {
                    let serverName = server._name;

                    if(this.killServerList.has(serverName) || this.laggyServerList.has(serverName))
                        return;
                    
                    if(server._group == null || server._group == undefined) {
                        this.logger.warn(`(${serverName}) Had a null group`);
                        return;
                    }

                    if(group.prefix == null || group.prefix == undefined) {
                        this.logger.warn(`(${group.name}) Had a null prefix`);
                    }

                    if(server._group.toLowerCase() != 
                       group.prefix.toLowerCase()) {
                        return;
                    }

                    if(checkServerJoinable(server)) {
                        joinableServers++;
                    }

                    if(checkServerEmpty(server)) {
                        emptyServers++;
                        _emptyServers.push(server);
                    }
                    
                    _allServers.set(key, server);
                    playerCount += server._playerCount;
                    serverCount++;
                });

                let serversToKill = (totalServers > requiredTotal && joinableServers > requiredJoinable) ? Math.min(joinableServers - requiredJoinable) : 0;
                let serversToAdd = 0;
                let serversToRestart = 0;

                if(group.name.toLowerCase() == "lobby") {
                    let availableSlots = group.maxPlayers - playerCount;

                    let minimumSlots = Config.config.serverMonitor.lobbyMinimumAvailableSlots;
                    if(availableSlots < minimumSlots) {
                        serversToAdd = Math.floor(Math.max(1, (minimumSlots - availableSlots) / group.maxPlayers));
                        serversToKill = 0;
                    } else if(serversToKill > 0){
                        serversToKill = Math.min(serversToKill, (availableSlots - minimumSlots) / 80);
                    } else if(serversToAdd == 0 && joinableServers > requiredJoinable && totalServers > requiredTotal) {
                        serversToRestart++;
                        // What's the point of this/???
                    }
                }

                if(ignoreServer(group.name))
                        return;

                while(serversToKill > 0) {
                    if(_emptyServers.length <= 0) {
                        this.logger.warn(`(${group.name}) No empty servers to kill`);
                        break;
                    }
                    let serverToKill = _emptyServers[_emptyServers.length - 1];
                    this.killServerList.set(serverToKill._name, ServerKilledReason.Excess);
                    this.serverTracker.set(serverToKill._name, OnlineServerStatus.Killed);
                    serversToKill--;
                }

                while(serversToAdd > 0) {
                    let serverNum = 1;
                    while(_allServers.has(`${group.prefix}-${serverNum}`)) {
                        serverNum++;
                    }
                    let serverName = `${group.prefix}-${serverNum}`;
                    if(this.serverTracker.has(serverName)) {
                        this.logger.log(`(${serverName}) Waiting to finish starting...`);
                    } else {
                        await DockerManager.createServer(group.prefix, serverName);
                        this.serverTracker.set(serverName, OnlineServerStatus.Starting);
                    }
                    serversToAdd--;
                }

            });

            await sleep(2000); // TODO: Add custom delay
        }
    }

}
