import chalk from 'chalk';
import ora from '../../utils/spinner.js';
import { api } from '../../services/api-service.js';
import { aiService } from '../../services/ai-service.js';
import { parseADF } from '../../utils/adf-parser.js';
import { handleCommandError } from '../../utils/error-handler.js';

export async function standupAction(options: any) {
    const spinner = ora('Analyzing your recent activity...').start();

    try {
        // 1. Fetch User Info
        const myself = await api.get('/myself');
        const accountId = myself.accountId;
        const displayName = myself.displayName;

        // 2. Fetch Issues Updated/Commented by User in last 24h
        // JQL: updated >= -24h AND (assignee = currentUser() OR watcher = currentUser() OR comment ~ currentUser())
        // Simplification: JQL: assignee = currentUser() AND updated >= -1d
        const yesterdayJql = `assignee = currentUser() AND updated >= -1d ORDER BY updated DESC`;

        const yesterdayIssuesRes = await api.get(`/search?jql=${encodeURIComponent(yesterdayJql)}&fields=summary,status,comment,worklog`);
        const yesterdayIssues = yesterdayIssuesRes.issues.map((i: any) => `- ${i.key} ${i.fields.summary} (${i.fields.status.name})`).join('\n');

        // 3. Fetch Issues Assigned for Today (In Progress or To Do)
        const todayJql = `assignee = currentUser() AND statusCategory IN ("To Do", "In Progress") ORDER BY priority DESC`;
        const todayIssuesRes = await api.get(`/search?jql=${encodeURIComponent(todayJql)}&fields=summary,status,priority`);
        const todayIssues = todayIssuesRes.issues.map((i: any) => `- ${i.key} ${i.fields.summary} [${i.fields.priority.name}]`).join('\n');

        spinner.text = 'Generating standup report...';

        const report = await aiService.generateStandup(yesterdayIssues, todayIssues);

        spinner.stop();

        console.log(chalk.green(`\n📢 Standup Report for ${displayName}:\n`));
        console.log(report);

    } catch (e: any) {
        handleCommandError(spinner, e, 'Failed to generate standup');
    }
}
