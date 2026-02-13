import chalk from 'chalk';
import { api } from '../services/api-service.js';
import ora from '../utils/spinner.js';
import fs from 'fs';
import path from 'path';
import { validateIssueKey } from '../utils/validators.js';
import { handleCommandError } from '../utils/error-handler.js';
// Node 20+ has global FormData and File, but for type safety or older environments:
// We rely on global FormData.
export function registerAttachCommand(issueCmd) {
    issueCmd
        .command('attach')
        .description('Attach a file to an issue')
        .argument('<issueKey>', 'Issue Key')
        .argument('<filePath>', 'Path to file')
        .action(async (issueKey, filePath) => {
        const check = validateIssueKey(issueKey);
        if (!check.valid) {
            console.error(chalk.red(check.message));
            return;
        }
        if (!fs.existsSync(filePath)) {
            console.error(chalk.red(`File not found: ${filePath}`));
            return;
        }
        const spinner = ora(`Uploading ${path.basename(filePath)} to ${issueKey}...`).start();
        try {
            // Use fs.openAsBlob (Node 20+)
            // @ts-ignore - TS might not know openAsBlob if target is old, but engine is Node 20
            const blob = await fs.openAsBlob(filePath);
            const formData = new FormData();
            formData.append('file', blob, path.basename(filePath));
            await api.upload(`/issue/${issueKey}/attachments`, formData);
            spinner.succeed(chalk.green(`Attached ${chalk.bold(path.basename(filePath))} to ${issueKey}`));
        }
        catch (e) {
            handleCommandError(spinner, e, 'Failed to attach file');
        }
    });
}
//# sourceMappingURL=issue-attach.js.map