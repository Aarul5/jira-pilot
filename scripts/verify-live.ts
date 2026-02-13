
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import path from 'path';

const execAsync = promisify(exec);
const JIRA_BIN = path.resolve(__dirname, '../dist/bin/jira.js');

const PROJECT = 'ITP';
const EPIC_ID = '86620'; // ITP-86
const EPIC_KEY = 'ITP-86';

let successCount = 0;
let failCount = 0;

async function runCommand(name: string, args: string, expectedOutput?: string | RegExp) {
    console.log(chalk.blue(`\n[TEST] ${name}`));
    const command = `node "${JIRA_BIN}" ${args}`;
    console.log(chalk.grey(`$ ${command}`));

    try {
        const { stdout, stderr } = await execAsync(command);
        // console.log(stdout); // Uncomment for verbose output

        if (stderr && !stderr.includes('Updating') && !stderr.includes('Fetching')) {
            console.warn(chalk.yellow('stderr:', stderr));
        }

        if (expectedOutput) {
            const output = stdout + stderr;
            const matched = typeof expectedOutput === 'string'
                ? output.includes(expectedOutput)
                : expectedOutput.test(output);

            if (!matched) {
                throw new Error(`Expected output to contain: ${expectedOutput}\nGot: ${output.substring(0, 200)}...`);
            }
        }

        console.log(chalk.green('✔ PASS'));
        successCount++;
        return stdout;
    } catch (e: any) {
        console.error(chalk.red('✖ FAIL'));
        console.error(chalk.red(e.message));
        failCount++;
        return null;
    }
}

async function main() {
    console.log(chalk.bold('🚀 Starting Real-world Jira CLI Verification'));
    console.log(`Target: Project ${PROJECT}, Epic ${EPIC_KEY} (${EPIC_ID})\n`);

    // 1. List Projects
    await runCommand('List Projects', `project list`, PROJECT);

    // 2. Create Issue (Story)
    const summary = `Auto-test Story ${Date.now()}`;
    const desc = "Created via automated verification script";
    const createOutput = await runCommand(
        'Create Story',
        `issue create -p ${PROJECT} -t Story -s "${summary}" -d "${desc}" --priority Medium -a me`,
        /Issue created: (ITP-\d+)/
    );

    let issueKey = null;
    if (createOutput) {
        const match = createOutput.match(/Issue created: (ITP-\d+)/);
        if (match) {
            issueKey = match[1];
            console.log(chalk.cyan(`Created Issue: ${issueKey}`));
        }
    }

    if (!issueKey) {
        console.error(chalk.red('Cannot proceed without a created issue. Aborting dependent tests.'));
        process.exit(1);
    }

    // 3. View Issue
    await runCommand('View Issue', `issue view ${issueKey}`, summary);

    // 4. Edit Issue
    await runCommand('Edit Issue', `issue edit ${issueKey} -s "${summary} (Updated)"`, /updated successfully/);

    // 5. Add Comment
    await runCommand('Add Comment', `issue comment ${issueKey} -m "Automated verification comment"`, /Comment added/);

    // 6. Assign Issue (to Unassigned then back to me)
    await runCommand('Unassign', `issue assign ${issueKey} -a none`, /unassigned successfully/);
    await runCommand('Assign Me', `issue assign ${issueKey} -a me`, /assigned successfully/);

    // 7. Create Subtask
    // Note: We use the issue ID if possible, but the CLI takes Parent Key and looks up ID internally now
    await runCommand('Create Subtask', `issue subtask ${issueKey} -s "Subtask for ${issueKey}"`, /Subtask created/);

    // 8. Link to Epic
    // Using 'Relates' or similar type - assuming 'Relates' exists. If not, it might fail.
    // Jira standard link types: "Relates", "Blocks", "Cloners", "Duplicate"
    // Let's try to fetch link types first or just guess "Relates".
    // Or link to Epic? Epics usually use "Epic Link" field, which is handled differently (custom field).
    // The `issue link` command does "Issue Linking" (issuelink resource).

    // Check if we can link using generic link
    // await runCommand('Link to Epic', `issue link ${issueKey} ${EPIC_KEY} -t Relates`, /Linked/); 
    // Skipping link test to avoid guessing link type names which vary by instance.

    // 9. Transition (Interactive usually, skipping or need status name)
    // await runCommand('Transition', `issue transition ${issueKey} -s "In Progress"`, /transitioned/);

    // 10. Search
    await runCommand('Search', `issue search "Auto-test" -p ${PROJECT}`, issueKey);

    // Summary
    console.log(chalk.bold('\n📊 Verification Summary'));
    console.log(chalk.green(`Passing: ${successCount}`));
    if (failCount > 0) console.log(chalk.red(`Failing: ${failCount}`));
    else console.log(chalk.blue('All tests passed! 🌟'));

    process.exit(failCount > 0 ? 1 : 0);
}

main();
