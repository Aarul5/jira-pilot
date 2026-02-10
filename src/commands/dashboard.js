import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import ora from 'ora';
import { api } from '../services/api-service.js';
import { handleCommandError } from '../utils/error-handler.js';

export function registerDashboardCommand(program) {
    program
        .command('dashboard')
        .description('Show a quick overview of your Jira activity')
        .option('-o, --output <format>', 'Output format (json)')
        .addHelpText('after', `
Examples:
  $ jira dashboard
  $ jira dashboard --output json
        `)
        .action(async (options) => {
            const spinner = ora('Loading dashboard...').start();
            try {
                // Fetch in parallel: my open issues + recently updated
                const [myIssues, recentIssues] = await Promise.all([
                    api.post('/search/jql', {
                        jql: 'assignee = currentUser() AND statusCategory != Done ORDER BY priority ASC, updated DESC',
                        maxResults: 8,
                        fields: ['summary', 'status', 'priority', 'updated']
                    }),
                    api.post('/search/jql', {
                        jql: 'assignee = currentUser() ORDER BY updated DESC',
                        maxResults: 5,
                        fields: ['summary', 'status', 'updated']
                    })
                ]);
                spinner.stop();

                if (options.output === 'json') {
                    console.log(JSON.stringify({
                        openIssues: (myIssues.issues || []).map(i => ({
                            key: i.key, summary: i.fields.summary,
                            status: i.fields.status?.name, priority: i.fields.priority?.name
                        })),
                        recentActivity: (recentIssues.issues || []).map(i => ({
                            key: i.key, summary: i.fields.summary,
                            status: i.fields.status?.name, updated: i.fields.updated
                        }))
                    }, null, 2));
                    return;
                }

                // ── Open Issues ──────────────────────────────────────
                console.log(chalk.bold('\n📋 Your Open Issues') + chalk.grey(` (${myIssues.total || 0} total)`));

                if (myIssues.issues && myIssues.issues.length > 0) {
                    const openTable = [
                        [chalk.bold('Key'), chalk.bold('Summary'), chalk.bold('Status'), chalk.bold('Priority')]
                    ];
                    myIssues.issues.forEach(i => {
                        const prio = i.fields.priority?.name || '';
                        const prioColor = prio === 'Highest' || prio === 'High' ? chalk.red(prio) : prio === 'Low' || prio === 'Lowest' ? chalk.blue(prio) : prio;
                        openTable.push([
                            chalk.cyan(i.key),
                            i.fields.summary ? (i.fields.summary.length > 50 ? i.fields.summary.substring(0, 47) + '...' : i.fields.summary) : '',
                            i.fields.status?.name || '',
                            prioColor
                        ]);
                    });
                    console.log(table(openTable));
                } else {
                    console.log(chalk.green('  🎉 No open issues — nice work!\n'));
                }

                // ── Recent Activity ──────────────────────────────────
                console.log(chalk.bold('🕐 Recent Activity'));

                if (recentIssues.issues && recentIssues.issues.length > 0) {
                    recentIssues.issues.forEach(i => {
                        const updated = i.fields.updated ? new Date(i.fields.updated).toLocaleDateString() : '';
                        console.log(`  ${chalk.cyan(i.key)} ${i.fields.summary || ''} ${chalk.grey(`[${i.fields.status?.name}] ${updated}`)}`);
                    });
                } else {
                    console.log(chalk.grey('  No recent activity.'));
                }
                console.log('');

            } catch (e) {
                handleCommandError(spinner, e, 'Failed to load dashboard');
            }
        });
}
