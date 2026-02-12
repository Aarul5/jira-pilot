import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { api } from '../services/api-service.js';
import ora from 'ora';
import { handleCommandError } from '../utils/error-handler.js';
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
        .option('-o, --output <format>', 'Output format (json)')
        .action(async (options) => {
        const spinner = ora('Fetching projects...').start();
        try {
            const data = await api.get('/project/search');
            spinner.stop();
            if (!data.values || data.values.length === 0) {
                console.log(chalk.yellow('No projects found.'));
                return;
            }
            if (options.output === 'json') {
                console.log(JSON.stringify(data.values.map((p) => ({
                    key: p.key, name: p.name,
                    lead: p.lead?.displayName || null, style: p.style
                })), null, 2));
                return;
            }
            const table = new Table({
                head: [chalk.bold('Key'), chalk.bold('Name'), chalk.bold('Leader'), chalk.bold('Style')]
            });
            data.values.forEach((p) => {
                table.push([
                    chalk.cyan(p.key),
                    p.name,
                    p.lead ? p.lead.displayName : 'N/A',
                    p.style
                ]);
            });
            console.log(table.toString());
        }
        catch (e) {
            handleCommandError(spinner, e, 'Failed to list projects');
        }
    });
    program.addCommand(projectCmd);
}
//# sourceMappingURL=project.js.map