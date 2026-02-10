import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { api } from '../services/api-service.js';
import ora from 'ora';
import { handleCommandError } from '../utils/error-handler.js';

export function registerSprintCommand(program) {
    const sprintCmd = new Command('sprint')
        .description('Manage Sprints')
        .addHelpText('after', `
Common Actions:
  $ jira sprint list --board <ID|Name>   # List sprints for a board
        `);

    sprintCmd
        .command('list')
        .description('List sprints for a board')
        .requiredOption('-b, --board <id>', 'Board ID or name')
        .option('-s, --state <state>', 'State (active, future, closed)', 'active,future')
        .action(async (options) => {
            const spinner = ora(`Fetching sprints for board ${options.board}...`).start();
            try {
                let boardId = options.board;

                // If board option is not a number, look it up by name
                if (isNaN(boardId)) {
                    spinner.text = `Looking up board "${options.board}"...`;
                    const boardData = await api.agileGet(`/board?name=${encodeURIComponent(options.board)}`);

                    if (!boardData.values || boardData.values.length === 0) {
                        throw new Error(`Board with name "${options.board}" not found. Please provide the numeric Board ID.`);
                    }

                    if (boardData.values.length > 1) {
                        const exact = boardData.values.find(b => b.name.toLowerCase() === options.board.toLowerCase());
                        if (exact) {
                            boardId = exact.id;
                        } else {
                            console.log(chalk.yellow(`\nMultiple boards found for "${options.board}". Using "${boardData.values[0].name}" (ID: ${boardData.values[0].id}).`));
                            boardId = boardData.values[0].id;
                        }
                    } else {
                        boardId = boardData.values[0].id;
                    }
                    spinner.text = `Fetching sprints for board ${options.board} (ID: ${boardId})...`;
                }

                const data = await api.agileGet(`/board/${boardId}/sprint?state=${options.state}`);
                spinner.stop();

                if (!data.values || data.values.length === 0) {
                    console.log(chalk.yellow('No sprints found.'));
                    return;
                }

                const tableData = [
                    [chalk.bold('ID'), chalk.bold('Name'), chalk.bold('State'), chalk.bold('Dates')]
                ];

                data.values.forEach(s => {
                    tableData.push([
                        s.id,
                        s.name,
                        s.state === 'active' ? chalk.green(s.state) : s.state,
                        `${s.startDate ? s.startDate.split('T')[0] : ''} -> ${s.endDate ? s.endDate.split('T')[0] : ''}`
                    ]);
                });

                console.log(table(tableData));

            } catch (e) {
                handleCommandError(spinner, e, 'Failed to list sprints');
            }
        });

    program.addCommand(sprintCmd);
}
