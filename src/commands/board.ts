import { Command } from 'commander';
import chalk from 'chalk';
import { Table } from 'cmd-table';
import { api } from '../services/api-service.js';
import ora from '../utils/spinner.js';
import { handleCommandError } from '../utils/error-handler.js';

export function registerBoardCommand(program: Command) {
    const boardCmd = new Command('board')
        .description('Manage Jira boards')
        .addHelpText('after', `
Common Actions:
  $ jira board list                   # List all boards
  $ jira board list -p PROJ           # List boards for a project
        `);

    boardCmd
        .command('list')
        .description('List Jira boards')
        .option('-p, --project <key>', 'Filter by project key')
        .option('-t, --type <type>', 'Filter by board type (scrum, kanban, simple)')
        .option('-l, --limit <n>', 'Max results', '50')
        .option('-o, --output <format>', 'Output format (json)')
        .action(async (options: any) => {
            const spinner = ora('Fetching boards...').start();
            try {
                const params = new URLSearchParams();
                params.set('maxResults', options.limit);

                if (options.project) {
                    params.set('projectKeyOrId', options.project);
                }
                if (options.type) {
                    params.set('type', options.type);
                }

                const data = await api.agileGet(`/board?${params.toString()}`);
                spinner.stop();

                if (!data.values || data.values.length === 0) {
                    console.log(chalk.yellow('No boards found.'));
                    return;
                }

                if (options.output === 'json') {
                    console.log(JSON.stringify(data.values.map((b: any) => ({
                        id: b.id, name: b.name,
                        type: b.type, project: b.location?.projectKey || null
                    })), null, 2));
                    return;
                }

                const table = new Table({
                    columns: [
                        { name: chalk.bold('ID') },
                        { name: chalk.bold('Name') },
                        { name: chalk.bold('Type') },
                        { name: chalk.bold('Project') }
                    ]
                });

                data.values.forEach((b: any) => {
                    table.addRow([
                        b.id,
                        b.name,
                        b.type,
                        b.location?.projectKey || '-'
                    ]);
                });

                console.log(table.render());
                console.log(chalk.grey(`Showing ${data.values.length} board(s)`));

            } catch (e: any) {
                handleCommandError(spinner, e, 'Failed to list boards');
            }
        });

    program.addCommand(boardCmd);
}
