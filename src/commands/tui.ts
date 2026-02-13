import { Command } from 'commander';
import { startTui } from '../tui/index.js';

export function registerTuiCommand(program: Command) {
    program
        .command('tui')
        .description('Start the interactive TUI mode')
        .action(async () => {
            startTui();
        });
}
