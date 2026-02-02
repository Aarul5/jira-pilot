import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { api } from '../services/api-service.js';
import ora from 'ora';
import { parseADF } from '../utils/adf-parser.js';

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
        .option('-e, --export <format>', 'Export output (json, md)')
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

                const searchApi = '/search/jql';
                const body = {
                    jql: jql || 'created is not empty',
                    maxResults: parseInt(options.limit),
                    fields: ['summary', 'status', 'assignee', 'created', 'updated', 'description']
                };

                const data = await api.post(searchApi, body);
                spinner.stop();

                if (!data.issues || data.issues.length === 0) {
                    console.log(chalk.yellow('No issues found.'));
                    return;
                }

                // Handling Export
                if (options.export) {
                    const fs = await import('fs');
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

                    if (options.export === 'json') {
                        const filename = `issues-${timestamp}.json`;
                        fs.writeFileSync(filename, JSON.stringify(data.issues, null, 2));
                        console.log(chalk.green(`\nExported ${data.issues.length} issues to ${chalk.bold(filename)}`));
                        return;
                    }

                    if (options.export === 'md') {
                        const filename = `issues-${timestamp}.md`;
                        let mdContent = `# Jira Issues Export\nGenerated: ${new Date().toLocaleString()}\n\n`;
                        mdContent += `| Key | Summary | Status | Assignee |\n`;
                        mdContent += `|---|---|---|---|\n`;

                        data.issues.forEach(i => {
                            const key = i.key;
                            const summary = i.fields.summary || '';
                            const status = i.fields.status?.name || '';
                            const assignee = i.fields.assignee?.displayName || 'Unassigned';
                            mdContent += `| ${key} | ${summary} | ${status} | ${assignee} |\n`;
                        });

                        fs.writeFileSync(filename, mdContent);
                        console.log(chalk.green(`\nExported ${data.issues.length} issues to ${chalk.bold(filename)}`));
                        return;
                    }
                }

                const tableData = [
                    [chalk.bold('Key'), chalk.bold('Summary'), chalk.bold('Status'), chalk.bold('Assignee'), chalk.bold('Created'), chalk.bold('Updated')]
                ];

                data.issues.forEach(i => {
                    tableData.push([
                        chalk.cyan(i.key),
                        i.fields.summary ? (i.fields.summary.length > 50 ? i.fields.summary.substring(0, 47) + '...' : i.fields.summary) : '',
                        i.fields.status ? i.fields.status.name : '',
                        i.fields.assignee ? i.fields.assignee.displayName : 'Unassigned',
                        i.fields.created ? i.fields.created.split('T')[0] : '',
                        i.fields.updated ? i.fields.updated.split('T')[0] : ''
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

    issueCmd
        .command('view')
        .description('View issue details')
        .argument('<issueKey>', 'Issue Key')
        .action(async (issueKey) => {
            const spinner = ora(`Fetching issue ${issueKey}...`).start();
            try {
                const issue = await api.get(`/issue/${issueKey}`);
                spinner.stop();

                console.log(chalk.bold(`\n${issue.key}: ${issue.fields.summary}`));
                console.log(chalk.grey(`${issue.fields.issuetype.name} - ${issue.fields.status.name} - ${issue.fields.priority ? issue.fields.priority.name : 'No Priority'}`));
                console.log(chalk.bold('\nDescription:'));
                console.log(parseADF(issue.fields.description) || 'No description provided.');

                if (issue.fields.assignee) {
                    console.log(chalk.bold('\nAssignee: ') + issue.fields.assignee.displayName);
                }

                if (issue.fields.comment && issue.fields.comment.comments.length > 0) {
                    console.log(chalk.bold('\nComments:'));
                    issue.fields.comment.comments.forEach(c => {
                        console.log(chalk.cyan(c.author.displayName) + ': ' + c.body);
                    });
                }
                console.log('');
            } catch (e) {
                spinner.fail('Failed to fetch issue');
                if (e.response) {
                    if (e.response.status === 404) {
                        console.error(chalk.red(`Issue "${issueKey}" not found.`));
                    } else {
                        console.error(chalk.red(`Error ${e.response.status}: `), e.response.data);
                    }
                } else {
                    console.error(chalk.red(e.message));
                }
            }
        });

    program.addCommand(issueCmd);
}
