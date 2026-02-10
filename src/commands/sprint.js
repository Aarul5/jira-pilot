import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { api } from '../services/api-service.js';
import ora from 'ora';
import { handleCommandError } from '../utils/error-handler.js';

export function registerSprintCommand(program) {
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
        .action(async (options) => {
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
                        const exact = boardData.values.find(b => b.name.toLowerCase() === options.board.toLowerCase());
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
        .action(async (options) => {
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
                    console.log(JSON.stringify(issues.issues.map(i => ({
                        key: i.key, summary: i.fields.summary,
                        status: i.fields.status?.name, assignee: i.fields.assignee?.displayName || null,
                        priority: i.fields.priority?.name
                    })), null, 2));
                    return;
                }

                const tableData = [
                    [chalk.bold('Key'), chalk.bold('Summary'), chalk.bold('Status'), chalk.bold('Assignee'), chalk.bold('Priority')]
                ];
                issues.issues.forEach(i => {
                    tableData.push([
                        chalk.cyan(i.key),
                        i.fields.summary ? (i.fields.summary.length > 50 ? i.fields.summary.substring(0, 47) + '...' : i.fields.summary) : '',
                        i.fields.status?.name || '',
                        i.fields.assignee?.displayName || 'Unassigned',
                        i.fields.priority?.name || ''
                    ]);
                });
                console.log(table(tableData));
                console.log(chalk.grey(`${issues.issues.length} issue(s) in sprint`));

            } catch (e) {
                handleCommandError(spinner, e, 'Failed to list sprint issues');
            }
        });

    program.addCommand(sprintCmd);
}
