import chalk from 'chalk';
import ora from '../../utils/spinner.js';
import { HttpClient } from '../../utils/http.js';
import { execSync } from 'child_process';
import { api } from '../../services/api-service.js';
import { aiService } from '../../services/ai-service.js';
import { validateIssueKey } from '../../utils/validators.js';
import { getCredentials } from '../../utils/config.js';
import { parseADF } from '../../utils/adf-parser.js';
import { handleCommandError } from '../../utils/error-handler.js';
export async function reviewAction(issueKey, options) {
    const check = validateIssueKey(issueKey);
    if (!check.valid) {
        console.error(chalk.red(check.message));
        return;
    }
    const { githubToken } = getCredentials();
    if (!githubToken) {
        console.error(chalk.red('GitHub Token not found. Run "jira config setup" or manually add githubToken to config.'));
        return;
    }
    const spinner = ora(`Fetching issue ${issueKey} and searching for PRs...`).start();
    try {
        // 1. Fetch Issue Context
        const issue = await api.get(`/issue/${issueKey}?fields=summary,description,acceptanceCriteria`); // basic fields
        const summary = issue.fields.summary;
        const description = issue.fields.description ? parseADF(issue.fields.description) : 'No description';
        const context = `Title: ${summary}\nDescription: ${description}`;
        // 2. Determine GitHub Repo from local git
        let repoOwner, repoName;
        try {
            const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
            // Parse: https://github.com/owner/repo.git or git@github.com:owner/repo.git
            const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^.]+)/);
            if (match) {
                repoOwner = match[1];
                repoName = match[2];
            }
        }
        catch (e) {
            // Ignore, maybe not in a repo
        }
        if (!repoOwner || !repoName) {
            spinner.fail('Could not detect GitHub repository from "git remote get-url origin".');
            console.log(chalk.yellow('Ensure you are in the git repository folder.'));
            return;
        }
        spinner.text = `Searching PRs in ${repoOwner}/${repoName} for ${issueKey}...`;
        // 3. Search GitHub PRs
        // We search for PRs that mention the issue key in title or branch name
        const http = new HttpClient();
        const searchRes = await http.get(`https://api.github.com/search/issues`, {
            params: {
                q: `repo:${repoOwner}/${repoName} is:pr ${issueKey}`
            },
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        const prs = searchRes.data.items;
        if (prs.length === 0) {
            spinner.fail(`No open PRs found for ${issueKey} in ${repoOwner}/${repoName}.`);
            return;
        }
        // Use the most recent PR
        const pr = prs[0];
        spinner.text = `Analyzing PR #${pr.number}: ${pr.title}...`;
        // 4. Fetch Diff
        const diffRes = await http.get(pr.pull_request.url, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3.diff'
            }
        });
        const diff = diffRes.data;
        if (!diff) {
            spinner.fail('Empty diff or failed to fetch diff.');
            return;
        }
        // 5. AI Review
        spinner.text = 'AI is reviewing the code changes...';
        const review = await aiService.reviewCode(diff, context);
        spinner.stop();
        console.log(chalk.green(`\n🤖 AI Code Review for PR #${pr.number} (${issueKey}):\n`));
        console.log(review);
        console.log(chalk.dim(`\nPR Link: ${pr.html_url}`));
    }
    catch (e) {
        handleCommandError(spinner, e, `Failed to review ${issueKey}`);
    }
}
//# sourceMappingURL=review.js.map