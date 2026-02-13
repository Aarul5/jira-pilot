import { startTui } from '../tui/index.js';
export function registerTuiCommand(program) {
    program
        .command('tui')
        .description('Start the interactive TUI mode')
        .action(async () => {
        startTui();
    });
}
//# sourceMappingURL=tui.js.map