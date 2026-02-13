import { Command } from 'commander';
import chalk from 'chalk';
import { Table } from 'cmd-table';
import { api } from '../services/api-service.js';
import ora from '../utils/spinner.js';
import enquirer from 'enquirer';
import { handleCommandError } from '../utils/error-handler.js';

export function registerSprintCommand(program: Command) {
    const sprintCmd = new Command('sprint')
        .description('Manage Sprints')
        .addHelpText('after', `
Common Actions:
  $ jira sprint list --board <ID|Name>   # List sprints for a board
        `);

    sprintCmd
        .command('list')
        .description('List sprints for a board')
        .requiredOption('-b, --board <id>', 'Board ID or name')
        .option('-s, --state <state>', 'State (active, future, closed)', 'active,future')
        .action(async (options: any) => {
            const spinner = ora(`Fetching sprints for board ${options.board}...`).start();
            try {
                let boardId = options.board;

                // If board option is not a number, look it up by name
                if (isNaN(boardId)) {
                    spinner.text = `Looking up board "${options.board}"...`;
                    const boardData = await api.agileGet(`/board?name=${encodeURIComponent(options.board)}`);

                    if (!boardData.values || boardData.values.length === 0) {
                        throw new Error(`Board with name "${options.board}" not found. Please provide the numeric Board ID.`);
                    }

                    if (boardData.values.length > 1) {
                        const exact = boardData.values.find((b: any) => b.name.toLowerCase() === options.board.toLowerCase());
                        if (exact) {
                            boardId = exact.id;
                        } else {
                            console.log(chalk.yellow(`\nMultiple boards found for "${options.board}". Using "${boardData.values[0].name}" (ID: ${boardData.values[0].id}).`));
                            boardId = boardData.values[0].id;
                        }
                    } else {
                        boardId = boardData.values[0].id;
                    }
                    spinner.text = `Fetching sprints for board ${options.board} (ID: ${boardId})...`;
                }

                const data = await api.agileGet(`/board/${boardId}/sprint?state=${options.state}`);
                spinner.stop();

                if (!data.values || data.values.length === 0) {
                    console.log(chalk.yellow('No sprints found.'));
                    return;
                }

                const table = new Table({
                    columns: [
                        { name: chalk.bold('ID') },
                        { name: chalk.bold('Name') },
                        { name: chalk.bold('State') },
                        { name: chalk.bold('Dates') }
                    ]
                });

                data.values.forEach((s: any) => {
                    table.addRow([
                        s.id,
                        s.name,
                        s.state === 'active' ? chalk.green(s.state) : s.state,
                        `${s.startDate ? s.startDate.split('T')[0] : ''} -> ${s.endDate ? s.endDate.split('T')[0] : ''}`
                    ]);
                });

                console.log(table.render());

            } catch (e: any) {
                handleCommandError(spinner, e, 'Failed to list sprints');
            }
        });

    // ── SPRINT ISSUES ────────────────────────────────────────────────
    sprintCmd
        .command('issues')
        .description('List issues in the active sprint')
        .requiredOption('-b, --board <id>', 'Board ID or name')
        .option('-o, --output <format>', 'Output format (json)')
        .addHelpText('after', `
Examples:
  $ jira sprint issues --board 5
  $ jira sprint issues --board "My Board" --output json
        `)
        .action(async (options: any) => {
            const spinner = ora('Fetching active sprint...').start();
            try {
                let boardId = options.board;

                if (isNaN(boardId)) {
                    spinner.text = `Looking up board "${options.board}"...`;
                    const boardData = await api.agileGet(`/board?name=${encodeURIComponent(options.board)}`);
                    if (!boardData.values || boardData.values.length === 0) {
                        throw new Error(`Board "${options.board}" not found.`);
                    }
                    boardId = boardData.values[0].id;
                }

                // Get active sprint
                const sprints = await api.agileGet(`/board/${boardId}/sprint?state=active`);
                if (!sprints.values || sprints.values.length === 0) {
                    spinner.stop();
                    console.log(chalk.yellow('No active sprint found.'));
                    return;
                }

                const activeSprint = sprints.values[0];
                spinner.text = `Fetching issues for sprint "${activeSprint.name}"...`;

                const issues = await api.agileGet(`/sprint/${activeSprint.id}/issue?maxResults=50&fields=summary,status,assignee,priority`);
                spinner.stop();

                if (!issues.issues || issues.issues.length === 0) {
                    console.log(chalk.yellow('No issues in active sprint.'));
                    return;
                }

                console.log(chalk.bold(`\n🏃 Sprint: ${activeSprint.name}\n`));

                if (options.output === 'json') {
                    console.log(JSON.stringify(issues.issues.map((i: any) => ({
                        key: i.key, summary: i.fields.summary,
                        status: i.fields.status?.name, assignee: i.fields.assignee?.displayName || null,
                        priority: i.fields.priority?.name
                    })), null, 2));
                    return;
                }

                const table = new Table({
                    columns: [
                        { name: chalk.bold('Key') },
                        { name: chalk.bold('Summary') },
                        { name: chalk.bold('Status') },
                        { name: chalk.bold('Assignee') },
                        { name: chalk.bold('Priority') }
                    ]
                });
                issues.issues.forEach((i: any) => {
                    table.addRow([
                        chalk.cyan(i.key),
                        i.fields.summary ? (i.fields.summary.length > 50 ? i.fields.summary.substring(0, 47) + '...' : i.fields.summary) : '',
                        i.fields.status?.name || '',
                        i.fields.assignee?.displayName || 'Unassigned',
                        i.fields.priority?.name || ''
                    ]);
                });
                console.log(table.render());
                console.log(chalk.grey(`${issues.issues.length} issue(s) in sprint`));

            } catch (e: any) {
                handleCommandError(spinner, e, 'Failed to list sprint issues');
            }
        });



    // ── START SPRINT ──────────────────────────────────────────────────
    sprintCmd
        .command('start')
        .description('Start a future sprint')
        .argument('<sprintId>', 'Sprint ID')
        .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
        .option('--end-date <date>', 'End date (YYYY-MM-DD)')
        .action(async (sprintId, options) => {
            const spinner = ora(`Fetching sprint ${sprintId}...`).start();
            try {
                const sprint = await api.agileGet(`/sprint/${sprintId}`);

                if (sprint.state === 'active') {
                    spinner.fail(`Sprint "${sprint.name}" is already active.`);
                    return;
                }
                if (sprint.state === 'closed') {
                    spinner.fail(`Sprint "${sprint.name}" is closed.`);
                    return;
                }
                spinner.stop();

                let startDate = options.startDate;
                let endDate = options.endDate;

                if (!startDate || !endDate) {
                    console.log(chalk.bold(`\nStarting Sprint: ${sprint.name}`));

                    const now = new Date();
                    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

                    const answers = await enquirer.prompt([
                        {
                            type: 'input',
                            name: 'startDate',
                            message: 'Start Date (YYYY-MM-DD):',
                            initial: now.toISOString().split('T')[0],
                            skip: !!startDate
                        },
                        {
                            type: 'input',
                            name: 'endDate',
                            message: 'End Date (YYYY-MM-DD):',
                            initial: twoWeeks.toISOString().split('T')[0],
                            skip: !!endDate
                        }
                    ]) as any;

                    if (!startDate) startDate = answers.startDate;
                    if (!endDate) endDate = answers.endDate;
                }

                // Append time to dates if missing (Jira requires ISO with time)
                const formatISO = (dateStr: string) => {
                    return dateStr.includes('T') ? dateStr : `${dateStr}T10:00:00.000+0000`;
                };

                const updateSpinner = ora('Starting sprint...').start();
                await api.agilePost(`/sprint/${sprintId}`, {
                    state: 'active',
                    startDate: formatISO(startDate),
                    endDate: formatISO(endDate)
                });
                updateSpinner.succeed(chalk.green(`Sprint "${chalk.bold(sprint.name)}" is now ACTIVE.`));

            } catch (e: any) {
                handleCommandError(spinner, e, 'Failed to start sprint');
            }
        });

    // ── COMPLETE SPRINT ───────────────────────────────────────────────
    sprintCmd
        .command('complete')
        .description('Complete (close) an active sprint')
        .argument('<sprintId>', 'Sprint ID')
        .action(async (sprintId) => {
            const spinner = ora(`Fetching sprint ${sprintId}...`).start();
            try {
                const sprint = await api.agileGet(`/sprint/${sprintId}`);

                if (sprint.state !== 'active') {
                    spinner.fail(`Sprint "${sprint.name}" is not active (State: ${sprint.state}).`);
                    return;
                }
                spinner.stop();

                const { confirmed } = await enquirer.prompt({
                    type: 'confirm',
                    name: 'confirmed',
                    message: `Are you sure you want to complete sprint "${chalk.cyan(sprint.name)}"?`,
                    initial: false
                }) as any;

                if (!confirmed) return;

                const closeSpinner = ora('Completing sprint...').start();
                // Note: If there are incomplete issues, Jira API might error or require specific handling (swap).
                // For simplified flow, we try basic close. If it fails, we inform user.
                await api.agilePost(`/sprint/${sprintId}`, {
                    state: 'closed'
                });
                closeSpinner.succeed(chalk.green(`Sprint "${chalk.bold(sprint.name)}" completed.`));

            } catch (e: any) {
                if (e.response && e.response.status === 400) {
                    // Check if it mentions incomplete issues
                    handleCommandError(spinner, e, 'Failed to complete sprint (Check if there are incomplete issues that need moving)');
                } else {
                    handleCommandError(spinner, e, 'Failed to complete sprint');
                }
            }
        });

    program.addCommand(sprintCmd);
}
