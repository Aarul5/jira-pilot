import { Command } from 'commander';
import chalk from 'chalk';
import ora from '../utils/spinner.js';
import enquirer from 'enquirer';
import { api } from '../services/api-service.js';
import { handleCommandError } from '../utils/error-handler.js';
import { API } from '../utils/api-paths.js';

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
                const data = await api.post(API.SEARCH.JQL, {
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
                    const transData = await api.get(API.ISSUE.TRANSITIONS(data.issues[0].key));
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
                        const transData = await api.get(API.ISSUE.TRANSITIONS(issue.key));
                        const transition = transData.transitions.find(
                            (t: any) => t.name.toLowerCase() === targetStatus.toLowerCase()
                        );

                        if (transition) {
                            await api.post(API.ISSUE.TRANSITIONS(issue.key), {
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

    // ── BULK ASSIGN ──────────────────────────────────────────────────
    bulkCmd
        .command('assign')
        .description('Assign multiple issues')
        .requiredOption('-j, --jql <query>', 'JQL query')
        .option('-a, --assignee <id>', 'AccountId or "me"')
        .option('-y, --yes', 'Skip confirmation')
        .action(async (options: any) => {
            const spinner = ora('Finding issues...').start();
            try {
                const data = await api.post(API.SEARCH.JQL, {
                    jql: options.jql,
                    maxResults: 50,
                    fields: ['summary', 'assignee']
                });
                spinner.stop();

                if (!data.issues?.length) {
                    console.log(chalk.yellow('No issues found.'));
                    return;
                }

                console.log(chalk.bold(`Found ${data.issues.length} issue(s):`));
                data.issues.forEach((i: any) => console.log(`  ${i.key}: ${i.fields.summary} (${i.fields.assignee?.displayName || 'Unassigned'})`));

                let assigneeId = options.assignee;
                if (!assigneeId) {
                    const { userId } = await enquirer.prompt({
                        type: 'input',
                        name: 'userId',
                        message: 'Enter Account ID (or "me"):',
                        validate: (val: string) => val.length > 0
                    }) as any;
                    assigneeId = userId;
                }

                if (assigneeId === 'me') {
                    const me = await api.get(API.USER.MYSELF);
                    assigneeId = me.accountId;
                }

                if (!options.yes) {
                    const { confirm } = await enquirer.prompt({
                        type: 'confirm',
                        name: 'confirm',
                        message: `Assign ${data.issues.length} issues to ${assigneeId}?`
                    }) as any;
                    if (!confirm) return;
                }

                const processSpinner = ora('Assigning...').start();
                for (const issue of data.issues) {
                    await api.put(API.ISSUE.ASSIGNEE(issue.key), { accountId: assigneeId });
                }
                processSpinner.succeed('Bulk assign complete.');

            } catch (e: any) {
                handleCommandError(spinner, e, 'Bulk assign failed');
            }
        });

    // ── BULK LABEL ───────────────────────────────────────────────────
    bulkCmd
        .command('label')
        .description('Add or remove labels from multiple issues')
        .requiredOption('-j, --jql <query>', 'JQL query')
        .option('--add <labels>', 'Comma-separated labels to add')
        .option('--remove <labels>', 'Comma-separated labels to remove')
        .option('-y, --yes', 'Skip confirmation')
        .action(async (options: any) => {
            if (!options.add && !options.remove) {
                console.log(chalk.red('Must specify --add or --remove'));
                return;
            }

            const spinner = ora('Finding issues...').start();
            try {
                const data = await api.post(API.SEARCH.JQL, {
                    jql: options.jql,
                    maxResults: 50,
                    fields: ['summary', 'labels']
                });
                spinner.stop();

                if (!data.issues?.length) {
                    console.log(chalk.yellow('No issues found.'));
                    return;
                }

                console.log(chalk.bold(`Found ${data.issues.length} issue(s).`));

                if (!options.yes) {
                    const { confirm } = await enquirer.prompt({
                        type: 'confirm',
                        name: 'confirm',
                        message: `Update labels for ${data.issues.length} issues?`
                    }) as any;
                    if (!confirm) return;
                }

                const processSpinner = ora('Updating labels...').start();
                const addList = options.add ? options.add.split(',').map((l: string) => l.trim()) : [];
                const removeList = options.remove ? options.remove.split(',').map((l: string) => l.trim()) : [];

                for (const issue of data.issues) {
                    const currentLabels = issue.fields.labels || [];
                    let newLabels = new Set(currentLabels);

                    addList.forEach((l: string) => newLabels.add(l));
                    removeList.forEach((l: string) => newLabels.delete(l));

                    await api.put(API.ISSUE.GET(issue.key), {
                        fields: { labels: Array.from(newLabels) }
                    });
                }
                processSpinner.succeed('Bulk labels updated.');

            } catch (e: any) {
                handleCommandError(spinner, e, 'Bulk label failed');
            }
        });

    program.addCommand(bulkCmd);
}
