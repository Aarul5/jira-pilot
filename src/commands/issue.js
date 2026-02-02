import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { api } from '../services/api-service.js';
import ora from 'ora';

export function registerIssueCommand(program) {
    const issueCmd = new Command('issue')
        .description('Manage Jira issues');

    issueCmd
        .command('list')
        .description('List issues')
        .option('-j, --jql <query>', 'JQL query to filter issues')
        .option('-l, --limit <number>', 'Limit results', '20')
        .option('-p, --project <key>', 'Filter by project')
        .option('-a, --assignee <id>', 'Filter by assignee (use "currentUser" for self)')
        .option('-s, --status <status>', 'Filter by status')
        .action(async (options) => {
            const spinner = ora('Fetching issues...').start();
            try {
                const jqlParts = [];
                if (options.project) jqlParts.push(`project = "${options.project}"`);
                if (options.assignee) jqlParts.push(`assignee = ${options.assignee === 'currentUser' ? 'currentUser()' : `"${options.assignee}"`}`);
                if (options.status) jqlParts.push(`status = "${options.status}"`);
                if (options.jql) jqlParts.push(options.jql);

                // Order by updated desc by default if no JQL
                if (!options.jql && jqlParts.length === 0) {
                    jqlParts.push('order by updated DESC');
                } else if (jqlParts.length > 0 && !options.jql) {
                    // Add order if not custom jql
                    // jqlParts.push('order by updated DESC');
                }

                const jql = jqlParts.join(' AND ');

                const searchApi = '/search';
                const body = {
                    jql: jql || '',
                    maxResults: parseInt(options.limit),
                    fields: ['summary', 'status', 'assignee', 'created', 'updated']
                };

                const data = await api.post(searchApi, body);
                spinner.stop();

                if (!data.issues || data.issues.length === 0) {
                    console.log(chalk.yellow('No issues found.'));
                    return;
                }

                const tableData = [
                    [chalk.bold('Key'), chalk.bold('Summary'), chalk.bold('Status'), chalk.bold('Assignee')]
                ];

                data.issues.forEach(i => {
                    tableData.push([
                        chalk.cyan(i.key),
                        i.fields.summary ? (i.fields.summary.length > 50 ? i.fields.summary.substring(0, 47) + '...' : i.fields.summary) : '',
                        i.fields.status ? i.fields.status.name : '',
                        i.fields.assignee ? i.fields.assignee.displayName : 'Unassigned'
                    ]);
                });

                console.log(table(tableData));

            } catch (e) {
                spinner.fail('Failed to list issues');
                if (e.response) {
                    console.error(chalk.red(`Error ${e.response.status}: `), e.response.data);
                } else {
                    console.error(chalk.red(e.message));
                }
            }
        });

    program.addCommand(issueCmd);
}
