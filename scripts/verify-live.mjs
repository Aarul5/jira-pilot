
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JIRA_BIN = path.resolve(__dirname, '../dist/bin/jira.js');

const PROJECT = 'ITP';
const EPIC_ID = '86620';
const EPIC_KEY = 'ITP-86';

let successCount = 0;
let failCount = 0;

const colors = {
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    grey: (text) => `\x1b[90m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    bold: (text) => `\x1b[1m${text}\x1b[0m`
};

async function runCommand(name, args, expectedOutput) {
    console.log(colors.blue(`\n[TEST] ${name}`));
    const commandStr = `node "${JIRA_BIN}" ${args}`;
    console.log(colors.grey(`$ ${commandStr}`));

    return new Promise((resolve) => {
        const proc = spawn('node', [JIRA_BIN, ...args.split(' ')], {
            shell: false,
            cwd: process.cwd(),
            env: process.env
        });

        let stdout = '';
        let stderr = '';
        let timer = setTimeout(() => {
            console.error(colors.red('TIMEOUT'));
            proc.kill();
        }, 30000); // 30s timeout

        proc.stdout.on('data', (data) => {
            const chunk = data.toString();
            stdout += chunk;
            process.stdout.write(colors.grey(chunk)); // Stream output
        });

        proc.stderr.on('data', (data) => {
            const chunk = data.toString();
            stderr += chunk;
            // process.stderr.write(colors.yellow(chunk)); 
        });

        proc.on('close', (code) => {
            clearTimeout(timer);
            if (code !== 0) {
                console.error(colors.red(`✖ FAIL (Exit code ${code})`));
                // console.error(colors.yellow('stderr: ' + stderr));
                failCount++;
                resolve(null);
                return;
            }

            if (expectedOutput) {
                const output = stdout + stderr;
                const matched = typeof expectedOutput === 'string'
                    ? output.includes(expectedOutput)
                    : expectedOutput.test(output);

                if (!matched) {
                    console.error(colors.yellow(`Expected match not found!`));
                    // console.error(colors.grey(`Output snippet: ${output.substring(0, 300)}...`));
                    failCount++;
                    resolve(null);
                    return;
                }
            }

            console.log(colors.green('✔ PASS'));
            successCount++;
            resolve(stdout);
        });
    });
}

function parseArgs(cmd) {
    // Simple parser to handle quoted strings (e.g. -s "foo bar")
    // But spawn with array handles args better. 
    // Here we need to split manually if strict. 
    // For simplicity, we'll let string split handle standard space args, 
    // but better to pass array in runCommand.
    // However, I used string in previous calls. I'll stick to string split but careful with quotes.
    // Actually, splitting by space breaks quotes.
    // I'll rewrite runCommand to accept array args or use regex match.
    // For now, let's use shell: true in spawn to handle command string?
    // "shell: true" allows command string.
    return cmd;
}

// Rewriting runCommand to use shell: true for easier arg string handling
async function runCommandShell(name, cmdArgs, expectedOutput) {
    console.log(colors.blue(`\n[TEST] ${name}`));
    const fullCmd = `node "${JIRA_BIN}" ${cmdArgs}`;
    console.log(colors.grey(`$ ${fullCmd}`));

    return new Promise((resolve) => {
        const proc = spawn(fullCmd, {
            shell: true,
            cwd: process.cwd(),
            env: process.env
        });

        let stdout = '';
        let stderr = '';

        // Timeout
        const timer = setTimeout(() => {
            console.error(colors.red('TIMEOUT'));
            proc.kill();
        }, 45000);

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
            process.stdout.write(colors.grey(data.toString()));
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
            // process.stderr.write(colors.yellow(data.toString()));
        });

        proc.on('close', (code) => {
            clearTimeout(timer);
            if (code !== 0) {
                console.error(colors.red(`✖ FAIL (Exit code ${code})`));
                if (stderr) console.error(colors.yellow('stderr:\n' + stderr));
                failCount++;
                resolve(null);
                return;
            }

            if (expectedOutput) {
                // Check both stdout and stderr for interactive prompts/output
                const output = stdout + stderr;
                const matched = typeof expectedOutput === 'string'
                    ? output.includes(expectedOutput)
                    : expectedOutput.test(output);

                if (!matched) {
                    console.error(colors.yellow(`Expected match not found!`));
                    failCount++;
                    resolve(null);
                    return;
                }
            }

            console.log(colors.green('✔ PASS'));
            successCount++;
            resolve(stdout);
        });
    });
}


async function main() {
    console.log(colors.bold('🚀 Starting Real-world Jira CLI Verification (Spawn)'));
    console.log(`Target: Project ${PROJECT}, Epic ${EPIC_KEY} (${EPIC_ID})\n`);

    if (!fs.existsSync(JIRA_BIN)) {
        console.error(colors.red(`Error: Jira BIN not found at ${JIRA_BIN}`));
        process.exit(1);
    }

    // 1. List Projects
    await runCommandShell('List Projects', `project list`, PROJECT);

    // 2. Create Issue (Story)
    const summary = `Auto-test Story ${Date.now()}`;
    const desc = "Created via automated verification script";
    // Important: Use quotes carefully in string
    const createOutput = await runCommandShell(
        'Create Story',
        `issue create -p ${PROJECT} -t Story -s "${summary}" -d "${desc}" --priority Medium -a me`,
        /Issue created: (ITP-\d+)/
    );

    let issueKey = null;
    if (createOutput) {
        const match = createOutput.match(/Issue created: (ITP-\d+)/);
        if (match) {
            issueKey = match[1];
            console.log(colors.cyan(`Created Issue: ${issueKey}`));
        }
    }

    if (!issueKey) {
        console.error(colors.red('Cannot proceed without a created issue. Aborting.'));
        process.exit(1);
    }

    // 3. View Issue
    await runCommandShell('View Issue', `issue view ${issueKey}`, summary);

    // 4. Edit Issue
    await runCommandShell('Edit Issue', `issue edit ${issueKey} -s "${summary} (Updated)"`, /updated successfully/);

    // 5. Add Comment
    await runCommandShell('Add Comment', `issue comment ${issueKey} -m "Automated verification comment"`, /Comment added/);

    // 6. Assign Issue
    await runCommandShell('Unassign', `issue assign ${issueKey} -a none`, /unassigned successfully/);
    await runCommandShell('Assign Me', `issue assign ${issueKey} -a me`, /assigned successfully/);

    // 7. Create Subtask
    const subSummary = `Subtask for ${issueKey}`;
    await runCommandShell('Create Subtask', `issue subtask ${issueKey} -s "${subSummary}"`, /Subtask created/);

    // 8. Search
    await runCommandShell('Search', `issue search "Auto-test" -p ${PROJECT}`, issueKey);

    // Summary
    console.log(colors.bold('\n📊 Verification Summary'));
    console.log(colors.green(`Passing: ${successCount}`));
    if (failCount > 0) console.log(colors.red(`Failing: ${failCount}`));
    else console.log(colors.blue('All tests passed! 🌟'));

    process.exit(failCount > 0 ? 1 : 0);
}

main();
