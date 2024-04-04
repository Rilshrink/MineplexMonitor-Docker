import Command from '../../command/command';
import RedisManager from '../../redis/redis';
import Logger from '../../utils/log';
import DockerManager from '../../docker/docker';

const logger = new Logger('createserver');

export default class createserver extends Command {
    
    constructor() {
        super('createserver');
    }

    public async execute(args: string[]): Promise<boolean> {
        if(args.length < 2) {
            logger.error("createserver <servergroup> <name>");
            return false;
        }

        const serverGroup: string = args[0];
        const serverGroups = await RedisManager.instance.smembers('servergroups');

        if(!serverGroups.includes(serverGroup)) {
            logger.error("Server group not found.");
            return false;
        }

        const serverName: string = args[1];
        const serverStatuses = await RedisManager.getServerStatuses();
        if(serverStatuses.get(serverName) != null) {
            logger.error(`Server already exists with name: ${serverName}`);
            return false;
        }

        await DockerManager.createServer(serverGroup, serverName);
        logger.log(`Created server ${serverGroup}: ${serverName}`);

        return true;
    }
}
