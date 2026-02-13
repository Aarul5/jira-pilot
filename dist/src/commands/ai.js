import { Command } from 'commander';
import chalk from 'chalk';
import ora from '../utils/spinner.js';
import enquirer from 'enquirer';
import { api } from '../services/api-service.js';
import { aiService } from '../services/ai-service.js';
import { parseADF } from '../utils/adf-parser.js';
import { validateIssueKey } from '../utils/validators.js';
import { handleCommandError } from '../utils/error-handler.js';
import { reviewAction } from './ai-actions/review.js';
import { planAction } from './ai-actions/plan.js';
import { standupAction } from './ai-actions/standup.js';
export function registerAiCommand(program) {
    const aiCmd = new Command('ai')
        .description('AI Helper commands')
        .addHelpText('after', `
Common Actions:
  $ jira ai summarize <KEY>         # Summarize an issue
  $ jira ai draft                   # Draft an issue description from bullet points
  $ jira ai suggest <KEY>           # Suggest next actions for an issue
        `);
    // ── SUMMARIZE ─────────────────────────────────────────────────────
    aiCmd
        .command('summarize')
        .description('Summarize an issue using AI')
        .argument('<issueKey>', 'Jira Issue Key')
        .action(async (issueKey) => {
        const check = validateIssueKey(issueKey);
        if (!check.valid) {
            console.error(chalk.red(check.message));
            return;
        }
        const spinner = ora(`Fetching issue ${issueKey}...`).start();
        try {
            const issue = await api.get(`/issue/${issueKey}?fields=summary,description,comment`);
            spinner.text = 'Generating summary...';
            const summary = issue.fields.summary;
            const description = issue.fields.description
                ? parseADF(issue.fields.description)
                : 'No description';
            const comments = (issue.fields.comment?.comments || [])
                .map((c) => `${c.author.displayName}: ${typeof c.body === 'object' ? parseADF(c.body) : c.body}`)
                .join('\n');
            const prompt = `
You are a helpful Jira assistant. Please summarize the following Jira issue.

Title: ${summary}
Description: ${description}

Comments:
${comments || 'No comments'}

Provide a concise summary of the current status, key discussion points, and next steps if clear.
            `;
            const aiResponse = await aiService.generate(prompt);
            spinner.stop();
            console.log(chalk.green(`\n🤖 AI Summary for ${issueKey}:\n`));
            console.log(aiResponse);
        }
        catch (e) {
            handleCommandError(spinner, e, `Failed to summarize ${issueKey}`);
        }
    });
    // ── DRAFT ─────────────────────────────────────────────────────────
    aiCmd
        .command('draft')
        .description('Draft a structured issue description from bullet points')
        .option('-i, --input <text>', 'Bullet points or rough notes (alternative to interactive prompt)')
        .option('-t, --type <type>', 'Issue type context (bug, story, task)', 'task')
        .addHelpText('after', `
Examples:
  $ jira ai draft                              # Interactive
  $ jira ai draft -i "login fails, returns 500, only on mobile"
  $ jira ai draft -i "add dark mode toggle" -t story
        `)
        .action(async (options) => {
        try {
            let bulletPoints = options.input;
            if (!bulletPoints) {
                const { inputNotes } = await enquirer.prompt({
                    type: 'input',
                    name: 'inputNotes',
                    message: 'Enter your bullet points or rough notes:',
                    validate: (val) => val.trim().length > 0 || 'Input cannot be empty'
                });
                bulletPoints = inputNotes;
            }
            const issueType = options.type || 'task';
            const spinner = ora('Drafting description...').start();
            const prompt = `
You are a Jira expert. Given the following rough notes/bullet points, generate a well-structured Jira issue description.

Issue Type: ${issueType}
Notes: ${bulletPoints}

Format the output as follows:
## Summary
A clear one-line summary for the issue title.

## Description
A well-structured description with:
- Context / Background
- Expected Behavior (if applicable)
- Steps to Reproduce (if it's a bug)
- Acceptance Criteria (if it's a story)

Keep it professional and concise. Output in plain text (not markdown headers, use plain labels).
                `;
            const aiResponse = await aiService.generate(prompt);
            spinner.stop();
            console.log(chalk.green('\n✍️  AI-Generated Draft:\n'));
            console.log(aiResponse);
            console.log(chalk.grey('\nTip: Copy this into "jira issue create" or use it as a starting point.'));
        }
        catch (e) {
            handleCommandError(null, e, 'Failed to generate draft');
        }
    });
    // ── SUGGEST ───────────────────────────────────────────────────────
    aiCmd
        .command('suggest')
        .description('Suggest next actions for an issue based on its context')
        .argument('<issueKey>', 'Jira Issue Key')
        .action(async (issueKey) => {
        const check = validateIssueKey(issueKey);
        if (!check.valid) {
            console.error(chalk.red(check.message));
            return;
        }
        const spinner = ora(`Analyzing issue ${issueKey}...`).start();
        try {
            const issue = await api.get(`/issue/${issueKey}?fields=summary,description,status,assignee,priority,comment,issuetype`);
            const summary = issue.fields.summary;
            const description = issue.fields.description
                ? parseADF(issue.fields.description)
                : 'No description';
            const status = issue.fields.status?.name || 'Unknown';
            const issueType = issue.fields.issuetype?.name || 'Unknown';
            const priority = issue.fields.priority?.name || 'None';
            const assignee = issue.fields.assignee?.displayName || 'Unassigned';
            const comments = (issue.fields.comment?.comments || [])
                .slice(-5) // Last 5 comments for context
                .map((c) => `${c.author.displayName}: ${typeof c.body === 'object' ? parseADF(c.body) : c.body}`)
                .join('\n');
            spinner.text = 'Generating suggestions...';
            const prompt = `
You are a senior software engineer and Jira workflow expert. Analyze the following Jira issue and suggest practical next actions.

Issue Key: ${issueKey}
Type: ${issueType}
Status: ${status}
Priority: ${priority}
Assignee: ${assignee}
Title: ${summary}
Description: ${description}

Recent Comments:
${comments || 'No comments'}

Based on the current status and context, suggest:
1. **Immediate Next Action** — What should be done right now?
2. **Potential Blockers** — Are there any risks or dependencies to watch?
3. **Suggested Status Transition** — Should this issue be moved to a different status?
4. **Recommendations** — Any other advice for this issue?

Keep suggestions actionable and concise.
                `;
            const aiResponse = await aiService.generate(prompt);
            spinner.stop();
            console.log(chalk.green(`\n💡 AI Suggestions for ${issueKey}:\n`));
            console.log(aiResponse);
        }
        catch (e) {
            handleCommandError(spinner, e, `Failed to suggest for ${issueKey}`);
        }
    });
    // ── REVIEW ────────────────────────────────────────────────────────
    aiCmd
        .command('review')
        .description('Analyze linked code/PRs for an issue')
        .argument('<issueKey>', 'Jira Issue Key')
        .action(reviewAction);
    // ── PLAN ──────────────────────────────────────────────────────────
    aiCmd
        .command('plan')
        .description('Break down an Epic into child stories/tasks')
        .argument('<epicKey>', 'Epic Issue Key')
        .action(planAction);
    // ── STANDUP ───────────────────────────────────────────────────────
    aiCmd
        .command('standup')
        .description('Generate a daily standup report from activity')
        .action(standupAction);
    program.addCommand(aiCmd);
}
//# sourceMappingURL=ai.js.map