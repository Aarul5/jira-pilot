import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { api } from '../services/api-service.js';
import ora from 'ora';

export function registerProjectCommand(program) {
    const projectCmd = new Command('project')
        .description('Manage Jira projects')
        .addHelpText('after', `
Common Actions:
  $ jira project list               # List all projects
        `);

    projectCmd
        .command('list')
        .description('List accessible projects')
        .action(async () => {
            const spinner = ora('Fetching projects...').start();
            try {
                const data = await api.get('/project/search');
                spinner.stop();

                if (!data.values || data.values.length === 0) {
                    console.log(chalk.yellow('No projects found.'));
                    return;
                }

                const tableData = [
                    [chalk.bold('Key'), chalk.bold('Name'), chalk.bold('Leader'), chalk.bold('Style')]
                ];

                data.values.forEach(p => {
                    tableData.push([
                        chalk.cyan(p.key),
                        p.name,
                        p.lead ? p.lead.displayName : 'N/A',
                        p.style
                    ]);
                });

                console.log(table(tableData));
            } catch (e) {
                spinner.fail('Failed to list projects');
                console.error(e.message);
            }
        });

    program.addCommand(projectCmd);
}
