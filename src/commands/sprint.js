import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { api } from '../services/api-service.js';
import ora from 'ora';

export function registerSprintCommand(program) {
    const sprintCmd = new Command('sprint')
        .description('Manage Sprints');

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
                const fullUrl = `${domain}/rest/agile/1.0/board/${options.board}/sprint?state=${options.state}`;

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
                    console.error(chalk.red(`Error ${e.response.status}: `), e.response.data);
                } else {
                    console.error(chalk.red(e.message));
                }
            }
        });

    program.addCommand(sprintCmd);
}
