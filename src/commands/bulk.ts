import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import enquirer from 'enquirer';
import { api } from '../services/api-service.js';
import { handleCommandError } from '../utils/error-handler.js';

export function registerBulkCommand(program: Command) {
    const bulkCmd = new Command('bulk')
        .description('Bulk operations on Jira issues')
        .addHelpText('after', `
Common Actions:
  $ jira bulk transition -j "project = PROJ AND status = 'To Do'" -s "In Progress"
        `);

    // ── BULK TRANSITION ──────────────────────────────────────────────
    bulkCmd
        .command('transition')
        .description('Transition multiple issues matching a JQL filter')
        .requiredOption('-j, --jql <query>', 'JQL query to select issues')
        .option('-s, --status <name>', 'Target status name')
        .option('-y, --yes', 'Skip confirmation prompt')
        .option('-l, --limit <n>', 'Max issues to process', '50')
        .addHelpText('after', `
Examples:
  $ jira bulk transition -j "project = PROJ AND status = 'To Do'" -s "In Progress"
  $ jira bulk transition -j "assignee = currentUser() AND status = Review" -s Done -y
        `)
        .action(async (options: any) => {
            const spinner = ora('Finding matching issues...').start();
            try {
                const data = await api.post('/search/jql', {
                    jql: options.jql,
                    maxResults: parseInt(options.limit),
                    fields: ['summary', 'status']
                });
                spinner.stop();

                if (!data.issues || data.issues.length === 0) {
                    console.log(chalk.yellow('No issues match the query.'));
                    return;
                }

                console.log(chalk.bold(`\nFound ${data.issues.length} issue(s):\n`));
                data.issues.forEach((i: any) => {
                    console.log(`  ${chalk.cyan(i.key)} ${i.fields.summary} [${i.fields.status.name}]`);
                });

                let targetStatus = options.status;

                if (!targetStatus) {
                    // Get transitions from the first issue to show available statuses
                    const transData = await api.get(`/issue/${data.issues[0].key}/transitions`);
                    const { Select } = enquirer as any;
                    const statusSelect = new Select({
                        name: 'status',
                        message: 'Target status',
                        choices: transData.transitions.map((t: any) => ({ name: t.name, message: t.name }))
                    });
                    targetStatus = await statusSelect.run();
                }

                if (!options.yes) {
                    const { Confirm } = enquirer as any;
                    const confirm = new Confirm({
                        name: 'proceed',
                        message: `Transition ${data.issues.length} issue(s) to "${targetStatus}"?`
                    });
                    if (!await confirm.run()) {
                        console.log(chalk.yellow('Cancelled.'));
                        return;
                    }
                }

                const transSpinner = ora(`Transitioning ${data.issues.length} issue(s)...`).start();
                let success = 0;
                let failed = 0;

                for (const issue of data.issues) {
                    try {
                        const transData = await api.get(`/issue/${issue.key}/transitions`);
                        const transition = transData.transitions.find(
                            (t: any) => t.name.toLowerCase() === targetStatus.toLowerCase()
                        );

                        if (transition) {
                            await api.post(`/issue/${issue.key}/transitions`, {
                                transition: { id: transition.id }
                            });
                            success++;
                        } else {
                            failed++;
                        }
                    } catch {
                        failed++;
                    }
                    transSpinner.text = `Transitioning... (${success + failed}/${data.issues.length})`;
                }

                transSpinner.succeed(`Done: ${chalk.green(`${success} succeeded`)}, ${failed > 0 ? chalk.red(`${failed} failed`) : '0 failed'}`);

            } catch (e: any) {
                handleCommandError(spinner, e, 'Bulk transition failed');
            }
        });

    program.addCommand(bulkCmd);
}
