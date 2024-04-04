/*
import Logger from '../utils/log';
import fastify, { FastifyReply, FastifyRequest } from 'fastify';
import AdminJSFastify from '@adminjs/fastify'
import AdminJS from 'adminjs'

export default class DashboardManager {

    public static readonly logger: Logger = new Logger('Dashboard');

    public static async init() {
        const server = fastify();
        const admin = new AdminJS({
            databases: [],
            rootPath: '/'
        });

        server.listen({ port: Config.config.dashboard.listenPort, host: '0.0.0.0' }, (err, addr) => {
            // TODO: Error Handling
        });

        this.logger.log(`Dashboard is listening at ${Config.config.dashboard.listenPort}`);
    }

}
*/