import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../services/api-service.js';
import { aiService } from '../services/ai-service.js';

export function registerAiCommand(program) {
    const aiCmd = new Command('ai')
        .description('AI Helper commands');

    aiCmd
        .command('summarize')
        .description('Summarize an issue using AI')
        .argument('<issueKey>', 'Jira Issue Key')
        .action(async (issueKey) => {
            const spinner = ora(`Fetching issue ${issueKey}...`).start();
            try {
                // Fetch issue details and comments
                const issue = await api.get(`/issue/${issueKey}?fields=summary,description,comment`);
                spinner.text = 'Generating summary...';

                const summary = issue.fields.summary;
                const description = issue.fields.description || 'No description';
                const comments = issue.fields.comment.comments.map(c => `${c.author.displayName}: ${c.body}`).join('\n');

                const prompt = `
            You are a helpful Jira assistant. Please summarize the following Jira issue.
            
            Title: ${summary}
            Description: ${description}
            
            Comments:
            ${comments}
            
            Provide a concise summary of the current status, key discussion points, and next steps if clear.
            `;

                const aiResponse = await aiService.generate(prompt);
                spinner.stop();

                console.log(chalk.green(`\n🤖 AI Summary for ${issueKey}:\n`));
                console.log(aiResponse);

            } catch (e) {
                spinner.stop(); // Ensure spinner stops
                if (e.response && e.response.config && e.response.config.url.includes('/issue/')) {
                    console.error(chalk.red(`\nError: Issue "${issueKey}" not found.`));
                } else {
                    console.error(chalk.red('\nFailed to generate summary:'));
                    if (e.response) {
                        console.error(chalk.red(`API Error ${e.response.status}: `), e.response.data);
                    } else {
                        console.error(chalk.red(e.message));
                    }
                }
            }
        });

    program.addCommand(aiCmd);
}
