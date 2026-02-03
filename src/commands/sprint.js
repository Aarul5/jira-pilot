import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { api } from '../services/api-service.js';
import ora from 'ora';

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
        .requiredOption('-b, --board <id>', 'Board ID')
        .option('-s, --state <state>', 'State (active, future, closed)', 'active,future')
        .action(async (options) => {
            const spinner = ora(`Fetching sprints for board ${options.board}...`).start();
            try {
                // Agile API usually involves /rest/agile/1.0
                // My default ApiService is /rest/api/3. I might need to override or allow full path?
                // ApiService handles baseURL. I should make it flexible or add Agile support.

                // HACK: ApiService constructor sets base to /rest/api/3. 
                // I need to use a different client or hack the URL.
                // Axios allows absolute URLs to override baseURL.
                // So if I pass full URL it works.

                const { jiraUrl } = (await import('../utils/config.js')).getCredentials();
                // Assuming api-service exposes client or get method.
                // But get method prepend baseURL? No, axios usually supports absolute URL.

                // Let's modify ApiService later to support 'type' or just use full path if needed.
                // Or simpler: /rest/agile/1.0/board/${id}/sprint
                // But api service baseURL is fixed.

                // To fix this proper: I'll modify ApiService to allow changing API version/path or just use full path.
                // Using full path:
                const match = jiraUrl.match(/^https?:\/\/(.+?)(\/|$)/);
                const domain = match ? match[0].replace(/\/$/, '') : jiraUrl;

                let boardId = options.board;

                // If board option is not a number, try to look it up using the Board Name/Key
                if (isNaN(boardId)) {
                    spinner.text = `Looking up board "${options.board}"...`;
                    const boardSearchUrl = `${domain}/rest/agile/1.0/board?name=${encodeURIComponent(options.board)}`;
                    const boardData = await api.get(boardSearchUrl);

                    if (!boardData.values || boardData.values.length === 0) {
                        // Fallback: It might be a project key. Let's try searching for boards associated with this project.
                        // But the API doesn't support projectKey filter directly on /board easily without iterating.
                        // For now, fail if name match doesn't work.
                        throw new Error(`Board with name "${options.board}" not found. Please provide the numeric Board ID.`);
                    }

                    // Strict match or pick first? Let's pick the first one but warn if multiple
                    if (boardData.values.length > 1) {
                        // Try to find exact match
                        const exact = boardData.values.find(b => b.name.toLowerCase() === options.board.toLowerCase());
                        if (exact) {
                            boardId = exact.id;
                        } else {
                            // Just pick first? Or error?
                            // Let's pick first but log
                            console.log(chalk.yellow(`\nMultiple boards found for "${options.board}". Using "${boardData.values[0].name}" (ID: ${boardData.values[0].id}).`));
                            boardId = boardData.values[0].id;
                        }
                    } else {
                        boardId = boardData.values[0].id;
                    }
                    spinner.text = `Fetching sprints for board ${options.board} (ID: ${boardId})...`;
                }

                const fullUrl = `${domain}/rest/agile/1.0/board/${boardId}/sprint?state=${options.state}`;

                const data = await api.get(fullUrl);
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
                spinner.fail('Failed to list sprints');
                if (e.response) {
                    if (e.response.status === 404) {
                        console.error(chalk.red(`\nError: Board with ID "${options.board}" not found or you do not have permission to view it.`));
                        console.error(chalk.grey('Tip: Verify the Board ID in your Jira URL: /jira/software/c/projects/KEY/boards/ID'));
                    } else {
                        console.error(chalk.red(`Error ${e.response.status}: `), e.response.data);
                    }
                } else {
                    console.error(chalk.red(e.message));
                }
            }
        });

    program.addCommand(sprintCmd);
}
