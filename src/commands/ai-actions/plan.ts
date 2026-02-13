import chalk from 'chalk';
import ora from '../../utils/spinner.js';
import enquirer from 'enquirer';
import { api } from '../../services/api-service.js';
import { aiService } from '../../services/ai-service.js';
import { validateIssueKey } from '../../utils/validators.js';
import { parseADF } from '../../utils/adf-parser.js';
import { handleCommandError } from '../../utils/error-handler.js';

export async function planAction(epicKey: string, options: any) {
    const check = validateIssueKey(epicKey);
    if (!check.valid) { console.error(chalk.red(check.message)); return; }

    const spinner = ora(`Fetching Epic ${epicKey}...`).start();

    try {
        const issue = await api.get(`/issue/${epicKey}`);
        const summary = issue.fields.summary;
        const description = issue.fields.description ? parseADF(issue.fields.description) : 'No description';
        const projectKey = issue.fields.project.key;

        spinner.text = 'AI is breaking down the Epic...';

        const plan = await aiService.breakdownEpic(summary, description);

        spinner.stop();

        if (!plan || plan.length === 0) {
            console.log(chalk.yellow('AI could not generate a plan.'));
            return;
        }

        console.log(chalk.cyan(`\nProposed Breakdown for ${epicKey} (${summary}):\n`));

        // Let user select items to create
        const choices = plan.map((item: any, index: number) => ({
            name: `${item.type}: ${item.summary}`,
            value: index, // store index to retrieve item
            checked: true
        }));

        const { selectedIndices } = await enquirer.prompt({
            type: 'multiselect',
            name: 'selectedIndices',
            message: 'Select issues to create:',
            choices: choices.map((c: any, i: number) => ({ ...c, value: i })), // ensure value is index
            result(names: any) {
                // map names back to indices
                return names.map((name: any) => (this as any).map(name)); // 'this.map' returns value (index)
            }
        }) as any;

        // Loop through selected and create
        // Convert map result (object/array) to array of indices
        const indicesToCreate = Object.values(selectedIndices) as number[];

        if (indicesToCreate.length === 0) {
            console.log(chalk.yellow('No items selected.'));
            return;
        }

        console.log(chalk.dim('\nCreating issues...'));

        const results = [];
        for (const idx of indicesToCreate) {
            const item = plan[idx];
            const itemSpinner = ora(`Creating ${item.type}: ${item.summary}`).start();

            try {
                const payload = {
                    fields: {
                        project: { key: projectKey },
                        summary: item.summary,
                        // description: item.description, // Simple string, Jira converts to ADF or accepts text depending on config. 
                        // Note: v3 API often needs ADF. If description is simple text, it might fail.
                        // We should construct a basic paragraph ADF document.
                        description: {
                            version: 1,
                            type: 'doc',
                            content: [{
                                type: 'paragraph',
                                content: [{ type: 'text', text: item.description || '' }]
                            }]
                        },
                        issuetype: { name: item.type },
                        parent: { key: epicKey } // Try to link to Epic
                    }
                };

                const res = await api.post('/issue', payload);
                itemSpinner.succeed(`${res.key} created.`);
                results.push(res.key);
            } catch (e) {
                itemSpinner.fail(`Failed to create ${item.summary}.`);
                // Fallback: try without description if ADF error
                try {
                    const payloadNoDesc = {
                        fields: {
                            project: { key: projectKey },
                            summary: item.summary,
                            issuetype: { name: item.type },
                            parent: { key: epicKey }
                        }
                    };
                    const res = await api.post('/issue', payloadNoDesc);
                    itemSpinner.succeed(`${res.key} created (without description).`);
                    results.push(res.key);
                } catch (e2) {
                    // ignore
                }
            }
        }

        console.log(chalk.green(`\nDone! Created ${results.length} issues linked to ${epicKey}.`));

    } catch (e: any) {
        handleCommandError(spinner, e, `Failed to plan ${epicKey}`);
    }
}
