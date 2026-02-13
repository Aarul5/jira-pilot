import chalk from 'chalk';
import { Table } from 'cmd-table';
import ora from '../utils/spinner.js';
import enquirer from 'enquirer';
import { api } from '../services/api-service.js';
import { handleCommandError } from '../utils/error-handler.js';
import { API } from '../utils/api-paths.js';
// Utility for status icons
const getStatusIcon = (status) => {
    const s = status.toLowerCase();
    if (s.includes('done') || s.includes('closed'))
        return '✅';
    if (s.includes('progress'))
        return '🏃';
    if (s.includes('review'))
        return '👀';
    return '📝';
};
// Utility for priority icons/colors
const getPriorityColor = (priority, text) => {
    const p = priority.toLowerCase();
    if (p.includes('highest'))
        return chalk.red.bold(text);
    if (p.includes('high'))
        return chalk.red(text);
    if (p.includes('medium'))
        return chalk.yellow(text);
    if (p.includes('low'))
        return chalk.blue(text);
    return chalk.grey(text);
};
export function registerDashboardCommand(program) {
    program
        .command('dashboard')
        .description('Interactive Jira Dashboard')
        .option('-o, --output <format>', 'Output format (json)')
        .action(async (options) => {
        if (options.output === 'json') {
            try {
                const [myIssues, recentIssues] = await Promise.all([
                    api.post('/search/jql', {
                        jql: 'assignee = currentUser() AND statusCategory != Done ORDER BY priority ASC, updated DESC',
                        maxResults: 15,
                        fields: ['summary', 'status', 'priority', 'updated']
                    }),
                    api.post('/search/jql', {
                        jql: 'assignee = currentUser() ORDER BY updated DESC',
                        maxResults: 5,
                        fields: ['summary', 'status', 'updated']
                    })
                ]);
                console.log(JSON.stringify({
                    openIssues: (myIssues.issues || []).map((i) => ({
                        key: i.key, summary: i.fields.summary,
                        status: i.fields.status?.name, priority: i.fields.priority?.name
                    })),
                    recentActivity: (recentIssues.issues || []).map((i) => ({
                        key: i.key, summary: i.fields.summary,
                        status: i.fields.status?.name, updated: i.fields.updated
                    }))
                }, null, 2));
            }
            catch (e) {
                console.error(JSON.stringify({ error: e.message }));
            }
            return;
        }
        // ── Interactive Dashboard ────────────────────────────
        while (true) {
            console.clear();
            const spinner = ora('Loading dashboard...').start();
            try {
                const myself = await api.get(API.USER.MYSELF);
                // Fetch in parallel: my open issues + recently updated
                const [myIssues, recentIssues] = await Promise.all([
                    api.post(API.SEARCH.JQL, {
                        jql: 'assignee = currentUser() AND statusCategory != Done ORDER BY priority ASC, updated DESC', // Fixed Sort
                        maxResults: 15,
                        fields: ['summary', 'status', 'priority', 'updated', 'issuetype']
                    }),
                    api.post('/search/jql', {
                        jql: 'assignee = currentUser() ORDER BY updated DESC',
                        maxResults: 5,
                        fields: ['summary', 'status', 'updated']
                    })
                ]);
                spinner.stop();
                // ── Header ───────────────────────────────────────────
                console.log(chalk.bold.blue('\n✈️  Jira Pilot Dashboard'));
                console.log(chalk.grey(`   User: ${myself.displayName} <${myself.emailAddress}>`));
                console.log('');
                // ── Open Issues Table ────────────────────────────────
                console.log(chalk.bold('📋 Your Open Issues') + chalk.grey(` (${myIssues.total || 0} total)`));
                const issues = myIssues.issues || [];
                if (issues.length > 0) {
                    const table = new Table({
                        columns: [
                            { name: chalk.bold('Key') },
                            { name: chalk.bold('Type') },
                            { name: chalk.bold('Summary') },
                            { name: chalk.bold('Status') },
                            { name: chalk.bold('Priority') }
                        ]
                    });
                    issues.forEach((i) => {
                        table.addRow([
                            chalk.cyan(i.key),
                            i.fields.issuetype?.name || '',
                            i.fields.summary ? (i.fields.summary.length > 40 ? i.fields.summary.substring(0, 37) + '...' : i.fields.summary) : '',
                            i.fields.status?.name || '',
                            getPriorityColor(i.fields.priority?.name || '', i.fields.priority?.name || '')
                        ]);
                    });
                    console.log(table.render());
                }
                else {
                    console.log(chalk.green('  🎉 No open issues — nice work!'));
                }
                console.log('');
                // ── Interactive Menu ─────────────────────────────────
                // Enhancing the selection UI as requested
                const choices = [
                    ...issues.map((i) => {
                        const statusIcon = getStatusIcon(i.fields.status?.name || '');
                        const priorityColor = getPriorityColor(i.fields.priority?.name || '', '●');
                        const key = chalk.cyan.bold(i.key.padEnd(10));
                        const summary = i.fields.summary.substring(0, 45);
                        return {
                            name: i.key,
                            message: `${priorityColor} ${key} ${statusIcon}  ${summary}`,
                            value: i.key
                        };
                    }),
                    { role: 'separator' },
                    { name: 'refresh', message: '🔄 Refresh Dashboard' },
                    { name: 'exit', message: '🚪 Exit' }
                ];
                const { action } = await enquirer.prompt({
                    type: 'select',
                    name: 'action',
                    message: 'Select an issue to manage:',
                    choices: choices
                });
                if (action === 'exit') {
                    console.log('Bye! 👋');
                    process.exit(0);
                }
                if (action === 'refresh') {
                    continue;
                }
                // Issue Selected: Show Action Menu
                const selectedKey = action;
                const { issueAction } = await enquirer.prompt({
                    type: 'select',
                    name: 'issueAction',
                    message: `Action for ${chalk.cyan(selectedKey)}:`,
                    choices: [
                        { name: 'view', message: '📄 View Details' },
                        { name: 'comment', message: '💬 Add Comment' },
                        { name: 'transition', message: '🚀 Transition Status' },
                        { name: 'assign', message: '👤 Assign' },
                        { name: 'back', message: '⬅️  Back to Dashboard' }
                    ]
                });
                if (issueAction === 'back')
                    continue;
                if (issueAction === 'view') {
                    const issue = await api.get(API.ISSUE.GET(selectedKey));
                    console.log(chalk.bold(`\n${issue.key}: ${issue.fields.summary}`));
                    console.log(chalk.grey('────────────────────────────────────────'));
                    console.log(`${getStatusIcon(issue.fields.status.name)} ${issue.fields.status.name}  |  ${getPriorityColor(issue.fields.priority?.name || '', issue.fields.priority?.name || '')}`);
                    console.log(`\n${issue.fields.description || chalk.italic('No description')}\n`);
                    await pause();
                }
                if (issueAction === 'comment') {
                    const { inputComment } = await enquirer.prompt({
                        type: 'input',
                        name: 'inputComment',
                        message: 'Comment:',
                    });
                    if (inputComment) {
                        const { textToADF } = await import('../utils/text-to-adf.js');
                        await api.post(API.ISSUE.COMMENT(selectedKey), { body: textToADF(inputComment) });
                        console.log(chalk.green('Comment added.'));
                        await pause();
                    }
                }
                if (issueAction === 'transition') {
                    const transData = await api.get(API.ISSUE.TRANSITIONS(selectedKey));
                    const { transId } = await enquirer.prompt({
                        type: 'select',
                        name: 'transId',
                        message: 'Select Status:',
                        choices: transData.transitions.map((t) => ({ name: t.id, message: t.to.name }))
                    });
                    await api.post(API.ISSUE.TRANSITIONS(selectedKey), { transition: { id: transId } });
                    console.log(chalk.green('Transitioned.'));
                    await pause();
                }
                if (issueAction === 'assign') {
                    await api.put(API.ISSUE.ASSIGNEE(selectedKey), { accountId: myself.accountId });
                    console.log(chalk.green('Assigned to you.'));
                    await pause();
                }
            }
            catch (e) {
                handleCommandError(spinner, e, 'Dashboard Error');
                break;
            }
        }
    });
}
async function pause() {
    await enquirer.prompt({ type: 'input', name: 'cont', message: 'Press Enter to continue...' });
}
//# sourceMappingURL=dashboard.js.map