import * as readline from 'readline';
import Logger from '../utils/log';
import Command from './command';

export default class CommandManager {
    public static readonly logger = new Logger('Console');
    public static readonly rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    private static commands: Map<string, Command> = new Map<string, Command>();

    public static registerCommand(cmd: Command) {
        this.commands.set(cmd.name, cmd);
    }

    public static async init() {
        await CommandManager.loop();
    }

    private static async loop() {
        this.rl.question('', async (string) => {
            if (!string) {
                await this.loop();
                return;
            }
            const args = string.split(' ');
            const command = args.shift()!;
            if (this.commands.has(command)) {
                this.commands.get(command)!.execute(args);
            } else {
                this.logger.error(`Can't find command "${command}"`);
            }
            await this.loop();
        });

        this.rl.on('close', () => {
            process.exit(0);
        });
    }
}
