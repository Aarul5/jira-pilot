import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { api } from '../services/api-service.js';
import ora from '../utils/spinner.js';
import enquirer from 'enquirer';
import { validateIssueKey } from '../utils/validators.js';
import { handleCommandError } from '../utils/error-handler.js';

export function registerGitCommand(program: Command) {
    const gitCmd = new Command('git')
        .description('Git integration for Jira');

    gitCmd
        .command('branch')
        .description('Create a git branch from a Jira issue')
        .argument('<issueKey>', 'Jira Issue Key (e.g., PROJ-123)')
        .option('-t, --type <type>', 'Branch type (feature, bugfix, hotfix)', 'feature')
        .action(async (issueKey: string, options: any) => {
            const check = validateIssueKey(issueKey);
            if (!check.valid) { console.error(chalk.red(check.message)); return; }
            const spinner = ora(`Fetching issue ${issueKey}...`).start();
            try {
                const issue = await api.get(`/issue/${issueKey}`);
                spinner.stop();

                const summary = issue.fields.summary;
                const sanitizedSummary = summary
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
                    .replace(/^-+|-+$/g, '');   // Trim leading/trailing hyphens

                const branchName = `${options.type}/${issueKey}-${sanitizedSummary}`;

                console.log(chalk.blue(`Proposed Branch Name: ${chalk.bold(branchName)}`));

                const { confirm } = await enquirer.prompt({
                    type: 'confirm',
                    name: 'confirm',
                    message: 'Create and switch to this branch?',
                    initial: true
                }) as any;

                if (confirm) {
                    try {
                        execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });
                        console.log(chalk.green('\nBranch created and checked out!'));
                    } catch (gitError) {
                        console.error(chalk.red('\nFailed to create branch. Are you in a git repository?'));
                    }
                }

            } catch (e: any) {
                handleCommandError(spinner, e, 'Failed to create branch');
            }
        });

    program.addCommand(gitCmd);
}
