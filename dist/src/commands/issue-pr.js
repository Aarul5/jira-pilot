import chalk from 'chalk';
import enquirer from 'enquirer';
import { api } from '../services/api-service.js';
import ora from '../utils/spinner.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { validateIssueKey } from '../utils/validators.js';
import { handleCommandError } from '../utils/error-handler.js';
import { parseADF } from '../utils/adf-parser.js';
const execAsync = promisify(exec);
export function registerPrCommand(issueCmd) {
    issueCmd
        .command('pr')
        .description('Create a GitHub Pull Request for an issue')
        .argument('<issueKey>', 'Issue Key')
        .action(async (issueKey) => {
        const check = validateIssueKey(issueKey);
        if (!check.valid) {
            console.error(chalk.red(check.message));
            return;
        }
        const spinner = ora(`Fetching issue ${issueKey}...`).start();
        try {
            // Check if gh CLI is installed
            try {
                await execAsync('gh --version');
            }
            catch (e) {
                spinner.fail('GitHub CLI (`gh`) is not installed or not in PATH.');
                console.log(chalk.yellow('Please install GitHub CLI to use this feature: https://cli.github.com/'));
                return;
            }
            const issue = await api.get(`/issue/${issueKey}?fields=summary,description,issuetype`);
            spinner.stop();
            const summary = issue.fields.summary;
            const description = parseADF(issue.fields.description) || '';
            const type = issue.fields.issuetype.name.toUpperCase();
            // Construct PR Title and Body
            const prTitle = `${issueKey}: ${summary}`;
            const prBody = `## Related Issue\n\n[${issueKey}](${api.domain}/browse/${issueKey})\n\n## Description\n\n${description}\n\n## Type of Change\n\n- [ ] ${type}`;
            console.log(chalk.bold('\nDraft PR Content:'));
            console.log(chalk.cyan('Title: ') + prTitle);
            console.log(chalk.cyan('Body:  ') + prBody.substring(0, 100) + '...\n');
            const { confirm } = await enquirer.prompt({
                type: 'confirm',
                name: 'confirm',
                message: 'Create Pull Request with `gh`?',
                initial: true
            });
            if (!confirm) {
                console.log(chalk.yellow('Cancelled.'));
                return;
            }
            const prSpinner = ora('Running gh pr create...').start();
            // Escape characters for shell is tricky, so we use --title and --body flags carefully.
            // A better approach for robust CLI usage might be to spawn the process with args directly to avoid shell parsing issues.
            // However, execAsync with proper escaping or spawn is needed. For simplicity in this demo, we can use a basic approach
            // or write to a temp file. To be safe, let's just pass them as arguments but be mindful of quotes.
            // For Windows compatibility, this can be complex.
            // Alternative: Interactive mode of gh pr create?
            // `gh pr create --title "..." --body "..."`
            // We will try running interactive mode if we can't easily pass args, but interactive inside a child_process is hard.
            // Let's try passing args.
            // Sanitize title and body for shell execution (basic)
            const safeTitle = prTitle.replace(/"/g, '\\"');
            const safeBody = prBody.replace(/"/g, '\\"');
            const command = `gh pr create --title "${safeTitle}" --body "${safeBody}" --web`;
            await execAsync(command);
            prSpinner.succeed('Pull Request created! (Browser opened)');
        }
        catch (e) {
            handleCommandError(spinner, e, 'Failed to create PR');
        }
    });
}
//# sourceMappingURL=issue-pr.js.map