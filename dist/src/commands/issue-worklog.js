import { Command } from 'commander';
import chalk from 'chalk';
import { Table } from 'cmd-table';
import { api } from '../services/api-service.js';
import ora from '../utils/spinner.js';
import { textToADF } from '../utils/text-to-adf.js';
import { validateIssueKey } from '../utils/validators.js';
import { handleCommandError } from '../utils/error-handler.js';
import { parseADF } from '../utils/adf-parser.js';
export function registerWorklogCommand(issueCmd) {
    const worklogCmd = new Command('worklog')
        .description('Manage worklogs (time tracking)')
        .addHelpText('after', `
Examples:
  $ jira issue worklog add PROJ-123 2h "Researching API"
  $ jira issue worklog list PROJ-123
        `);
    worklogCmd
        .command('add')
        .description('Add a worklog entry')
        .argument('<issueKey>', 'Issue Key')
        .argument('<timeSpent>', 'Time spent (e.g., 2h, 30m, 1d)')
        .argument('[comment]', 'Worklog comment')
        .action(async (issueKey, timeSpent, comment) => {
        const check = validateIssueKey(issueKey);
        if (!check.valid) {
            console.error(chalk.red(check.message));
            return;
        }
        const spinner = ora(`Adding worklog to ${issueKey}...`).start();
        try {
            const body = {
                timeSpent: timeSpent
            };
            if (comment) {
                body.comment = textToADF(comment);
            }
            await api.post(`/issue/${issueKey}/worklog`, body);
            spinner.succeed(chalk.green(`Logged ${chalk.bold(timeSpent)} to ${chalk.bold(issueKey)}`));
        }
        catch (e) {
            handleCommandError(spinner, e, 'Failed to add worklog');
        }
    });
    worklogCmd
        .command('list')
        .description('List worklogs for an issue')
        .argument('<issueKey>', 'Issue Key')
        .action(async (issueKey) => {
        const check = validateIssueKey(issueKey);
        if (!check.valid) {
            console.error(chalk.red(check.message));
            return;
        }
        const spinner = ora(`Fetching worklogs for ${issueKey}...`).start();
        try {
            const data = await api.get(`/issue/${issueKey}/worklog`);
            spinner.stop();
            if (!data.worklogs || data.worklogs.length === 0) {
                console.log(chalk.yellow(`No worklogs found for ${issueKey}.`));
                return;
            }
            console.log(chalk.bold(`\nWorklogs for ${chalk.cyan(issueKey)}:`));
            const table = new Table({
                columns: [
                    { name: chalk.bold('Author') },
                    { name: chalk.bold('Time Spent') },
                    { name: chalk.bold('Date') },
                    { name: chalk.bold('Comment') }
                ]
            });
            data.worklogs.forEach((w) => {
                table.addRow([
                    w.author?.displayName || 'Unknown',
                    w.timeSpent,
                    w.started.split('T')[0],
                    w.comment ? (parseADF(w.comment)?.substring(0, 50) + '...') : ''
                ]);
            });
            console.log(table.render());
        }
        catch (e) {
            handleCommandError(spinner, e, 'Failed to list worklogs');
        }
    });
    issueCmd.addCommand(worklogCmd);
}
//# sourceMappingURL=issue-worklog.js.map