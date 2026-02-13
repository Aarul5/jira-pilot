import { Command } from 'commander';
import chalk from 'chalk';
import { Table } from 'cmd-table';
import { api } from '../services/api-service.js';
import { aiService } from '../services/ai-service.js';
import ora from '../utils/spinner.js';
import enquirer from 'enquirer';
import { parseADF } from '../utils/adf-parser.js';
import { textToADF } from '../utils/text-to-adf.js';
import { validateIssueKey } from '../utils/validators.js';

import { handleCommandError } from '../utils/error-handler.js';
import { registerWorklogCommand } from './issue-worklog.js';
import { registerPrCommand } from './issue-pr.js';
import { registerAttachCommand } from './issue-attach.js';
import { ConfigService } from '../services/config-service.js';
import { API } from '../utils/api-paths.js';

export function registerIssueCommand(program: Command) {
    const issueCmd = new Command('issue')
        .description('Manage Jira issues')
        .addHelpText('after', `
Common Actions:
  $ jira issue list                 # List assigned issues
  $ jira issue view <KEY>           # View issue details
  $ jira issue create               # Create new issue (interactive)
  $ jira issue transition <KEY>     # Move issue status
        `);

    issueCmd
        .command('list')
        .description('List issues')
        .option('-j, --jql <query>', 'JQL query to filter issues')
        .option('--ask <query>', 'Filter issues using natural language query (AI)')
        .option('-l, --limit <number>', 'Limit results', '20')
        .option('-p, --project <key>', 'Filter by project')
        .option('-a, --assignee <id>', 'Filter by assignee (use "currentUser" for self)')
        .option('-s, --status <status>', 'Filter by status')
        .option('-e, --export <format>', 'Export output (json, md)')
        .option('-o, --output <format>', 'Output format (json)')
        .addHelpText('after', `
Examples:
  $ jira issue list --project PROJ --status "In Progress"
  $ jira issue list --assignee currentUser --limit 10
  $ jira issue list --jql "created >= -7d"
  $ jira issue list --export json
        `)
        .action(async (options: any) => {
            const spinner = ora('Fetching issues...').start();
            try {
                // Natural Language JQL
                if (options.ask) {
                    const aiSpinner = ora(`Translating query: "${options.ask}"...`).start();
                    try {
                        const generatedJql = await aiService.generateJql(options.ask);
                        aiSpinner.succeed(`JQL: ${chalk.cyan(generatedJql)}`);
                        options.jql = generatedJql; // Override/Set JQL
                    } catch (e: any) {
                        aiSpinner.fail('Failed to translate query.');
                        console.error(chalk.red(e.message));
                        return;
                    }
                }

                const jqlParts = [];
                if (options.project) jqlParts.push(`project = "${options.project}"`);
                if (options.assignee) jqlParts.push(`assignee = ${options.assignee === 'currentUser' ? 'currentUser()' : `"${options.assignee}"`}`);
                if (options.status) jqlParts.push(`status = "${options.status}"`);
                if (options.jql) jqlParts.push(options.jql);

                // Order by updated desc by default if no JQL
                const jql = jqlParts.join(' AND ');

                // Default to last 30 days if no filter provided to satisfy "unbounded" check
                const defaultJql = 'updated >= -30d ORDER BY updated DESC';
                const finalJql = jql || defaultJql;

                const body = {
                    jql: finalJql,
                    maxResults: parseInt(options.limit),
                    fields: ['summary', 'status', 'assignee', 'created', 'updated', 'description', 'priority', 'issuetype', 'project', 'reporter']
                };

                const data = await api.post(API.SEARCH.JQL, body);
                spinner.stop();

                if (!data.issues || data.issues.length === 0) {
                    console.log(chalk.yellow('No issues found.'));
                    return;
                }

                // Handling Export
                if (options.export) {
                    const fs = await import('fs');
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

                    if (options.export === 'json') {
                        const filename = `issues-${timestamp}.json`;
                        fs.writeFileSync(filename, JSON.stringify(data.issues, null, 2));
                        console.log(chalk.green(`\nExported ${data.issues.length} issues to ${chalk.bold(filename)}`));
                        return;
                    }

                    if (options.export === 'md') {
                        const filename = `issues-${timestamp}.md`;
                        let mdContent = `# Jira Issues Export\nGenerated: ${new Date().toLocaleString()}\n\n`;
                        mdContent += `| Key | Summary | Status | Assignee |\n`;
                        mdContent += `|---|---|---|---|\n`;

                        data.issues.forEach((i: any) => {
                            const key = i.key;
                            const summary = i.fields.summary || '';
                            const status = i.fields.status?.name || '';
                            const assignee = i.fields.assignee?.displayName || 'Unassigned';
                            mdContent += `| ${key} | ${summary} | ${status} | ${assignee} |\n`;
                        });

                        fs.writeFileSync(filename, mdContent);
                        console.log(chalk.green(`\nExported ${data.issues.length} issues to ${chalk.bold(filename)}`));
                        return;
                    }
                }

                if (options.output === 'json') {
                    console.log(JSON.stringify(data.issues.map((i: any) => ({
                        key: i.key, summary: i.fields.summary,
                        status: i.fields.status?.name, assignee: i.fields.assignee?.displayName || null,
                        created: i.fields.created, updated: i.fields.updated
                    })), null, 2));
                    return;
                }

                const table = new Table({
                    columns: [
                        { name: chalk.bold('Key') },
                        { name: chalk.bold('Summary') },
                        { name: chalk.bold('Status') },
                        { name: chalk.bold('Assignee') },
                        { name: chalk.bold('Created') },
                        { name: chalk.bold('Updated') }
                    ]
                });

                data.issues.forEach((i: any) => {
                    table.addRow([
                        chalk.cyan(i.key),
                        i.fields.summary ? (i.fields.summary.length > 50 ? i.fields.summary.substring(0, 47) + '...' : i.fields.summary) : '',
                        i.fields.status ? i.fields.status.name : '',
                        i.fields.assignee ? i.fields.assignee.displayName : 'Unassigned',
                        i.fields.created ? i.fields.created.split('T')[0] : '',
                        i.fields.updated ? i.fields.updated.split('T')[0] : ''
                    ]);
                });

                console.log(table.render());

            } catch (e: any) {
                handleCommandError(spinner, e, 'Failed to list issues');
            }
        });

    issueCmd
        .command('view')
        .description('View issue details')
        .argument('<issueKey>', 'Issue Key')
        .option('-o, --output <format>', 'Output format (json)')
        .addHelpText('after', `
Examples:
  $ jira issue view PROJ-123
  $ jira issue view PROJ-123 --output json
        `)
        .action(async (issueKey: string, options: any) => {
            const check = validateIssueKey(issueKey);
            if (!check.valid) { console.error(chalk.red(check.message)); return; }
            const spinner = ora(`Fetching issue ${issueKey}...`).start();
            try {
                const issue = await api.get(API.ISSUE.GET(issueKey));
                spinner.stop();

                if (options.output === 'json') {
                    console.log(JSON.stringify({
                        key: issue.key, summary: issue.fields.summary,
                        status: issue.fields.status?.name, priority: issue.fields.priority?.name,
                        assignee: issue.fields.assignee?.displayName || null,
                        type: issue.fields.issuetype?.name,
                        description: parseADF(issue.fields.description) || null,
                        created: issue.fields.created, updated: issue.fields.updated
                    }, null, 2));
                    return;
                }

                console.log(chalk.bold(`\n${issue.key}: ${issue.fields.summary}`));
                console.log(chalk.grey(`${issue.fields.issuetype.name} - ${issue.fields.status.name} - ${issue.fields.priority ? issue.fields.priority.name : 'No Priority'}`));
                console.log(chalk.bold('\nDescription:'));
                console.log(parseADF(issue.fields.description) || 'No description provided.');

                if (issue.fields.assignee) {
                    console.log(chalk.bold('\nAssignee: ') + issue.fields.assignee.displayName);
                }

                if (issue.fields.components && issue.fields.components.length > 0) {
                    console.log(chalk.bold('Components: ') + issue.fields.components.map((c: any) => c.name).join(', '));
                }

                if (issue.fields.labels && issue.fields.labels.length > 0) {
                    console.log(chalk.bold('Labels: ') + issue.fields.labels.join(', '));
                }

                if (issue.fields.duedate) {
                    console.log(chalk.bold('Due Date: ') + issue.fields.duedate);
                }

                if (issue.fields.fixVersions && issue.fields.fixVersions.length > 0) {
                    console.log(chalk.bold('Fix Versions: ') + issue.fields.fixVersions.map((v: any) => v.name).join(', '));
                }

                if (issue.fields.comment && issue.fields.comment.comments.length > 0) {
                    console.log(chalk.bold('\nComments:'));
                    issue.fields.comment.comments.forEach((c: any) => {
                        console.log(chalk.cyan(c.author.displayName) + ': ' + (parseADF(c.body) || ''));
                    });
                }
                console.log('');
            } catch (e: any) {
                handleCommandError(spinner, e, 'Failed to fetch issue');
            }
        });

    // ── CREATE ────────────────────────────────────────────────────────
    issueCmd
        .command('create')
        .description('Create a new Jira issue')
        .option('-p, --project <key>', 'Project key')
        .option('-t, --type <type>', 'Issue type (e.g., Bug, Story, Task)')
        .option('-s, --summary <text>', 'Issue summary')
        .option('-d, --description <text>', 'Issue description')
        .option('--priority <name>', 'Priority name (e.g., High, Medium, Low)')
        .option('-a, --assignee <id>', 'Assignee account ID (use "me" for self)')
        .option('-l, --labels <list>', 'Labels (comma separated)')
        .option('-c, --components <list>', 'Component IDs (comma separated)', (v: string, l: string[]) => l.concat([v]), [])
        .option('--fix-versions <list>', 'Fix Version IDs (comma separated)', (v: string, l: string[]) => l.concat([v]), [])
        .option('--due-date <date>', 'Due Date (YYYY-MM-DD)')
        .option('--no-input', 'Disable interactive prompts for optional fields')
        .option('--custom <key=value>', 'Custom fields (key=value, repeatable)', (v: string, l: string[]) => l.concat([v]), [])
        .addHelpText('after', `
Examples:
  $ jira issue create                                    # Interactive wizard
  $ jira issue create -p PROJ -s "Fix login bug"         # Quick create
  $ jira issue create -p PROJ -t Bug -s "Crash on save" --priority High
  $ jira issue create -p PROJ -s "New feature" -a me
  $ jira issue create -p PROJ -s "Story" --custom "storyPoints=5"
        `)
        .action(async (options: any) => {
            let spinner: any = null;
            try {
                // ── Step 1: Select Project ──────────────────────────
                let projectKey = options.project;
                if (!projectKey) {
                    const spinner = ora('Fetching projects...').start();
                    const projectData = await api.get(API.PROJECT.SEARCH);
                    spinner.stop();

                    if (!projectData.values || projectData.values.length === 0) {
                        console.error(chalk.red('No projects found. Check your permissions.'));
                        return;
                    }

                    const projectChoices = projectData.values.map((p: any) => ({
                        name: p.key,
                        message: `${p.key} — ${p.name}`
                    }));

                    const { selectedProject } = await enquirer.prompt({
                        type: 'select',
                        name: 'selectedProject',
                        message: 'Select Project:',
                        choices: projectChoices
                    }) as any;
                    projectKey = selectedProject;
                }

                // ── Step 2: Select Issue Type ───────────────────────
                let issueTypeName = options.type;
                if (!issueTypeName) {
                    const spinner = ora('Fetching issue types...').start();
                    let issueTypes = [];
                    try {
                        // Jira Cloud v3 - createmeta endpoint
                        const metaData = await api.get(API.ISSUE.CREATEMETA(projectKey));
                        issueTypes = metaData.issueTypes || metaData.values || [];
                    } catch (metaErr) {
                        // Fallback: use project-level issue types
                        try {
                            const projectInfo = await api.get(API.PROJECT.GET(projectKey));
                            issueTypes = projectInfo.issueTypes || [];
                        } catch {
                            issueTypes = [
                                { name: 'Task' }, { name: 'Bug' },
                                { name: 'Story' }, { name: 'Epic' }
                            ];
                        }
                    }
                    spinner.stop();

                    if (issueTypes.length === 0) {
                        issueTypes = [
                            { name: 'Task' }, { name: 'Bug' },
                            { name: 'Story' }, { name: 'Epic' }
                        ];
                    }

                    // Filter out sub-tasks if present
                    const filteredTypes = issueTypes.filter((t: any) => !t.subtask);
                    const typeChoices = (filteredTypes.length > 0 ? filteredTypes : issueTypes)
                        .map((t: any) => ({ name: t.name, message: t.name }));

                    const { selectedType } = await enquirer.prompt({
                        type: 'select',
                        name: 'selectedType',
                        message: 'Select Issue Type:',
                        choices: typeChoices
                    }) as any;
                    issueTypeName = selectedType;
                }

                // ── Step 3: Summary (required) ──────────────────────
                let summary = options.summary;
                if (!summary) {
                    const { inputSummary } = await enquirer.prompt({
                        type: 'input',
                        name: 'inputSummary',
                        message: 'Summary (required):',
                        validate: (val: any) => val.trim().length > 0 || 'Summary cannot be empty'
                    }) as any;
                    summary = inputSummary;
                }

                // ── Step 4: Description (optional) ──────────────────
                let description = options.description;
                if (description === undefined) {
                    const { inputDescription } = await enquirer.prompt({
                        type: 'input',
                        name: 'inputDescription',
                        message: 'Description (optional, press Enter to skip):'
                    }) as any;
                    description = inputDescription || null;
                }

                // ── Step 5: Priority ────────────────────────────────
                let priorityName = options.priority;
                if (!priorityName && !options.noInput) {
                    const spinner = ora('Fetching priorities...').start();
                    try {
                        const priorities = await api.get(API.PRIORITY.ALL);
                        spinner.stop();

                        if (Array.isArray(priorities) && priorities.length > 0) {
                            const priorityChoices = priorities.map((p: any) => ({
                                name: p.name,
                                message: p.name
                            }));

                            const { selectedPriority } = await enquirer.prompt({
                                type: 'select',
                                name: 'selectedPriority',
                                message: 'Select Priority:',
                                choices: priorityChoices
                            }) as any;
                            priorityName = selectedPriority;
                        }
                    } catch {
                        spinner.stop();
                        // Priority endpoint may not be available; skip
                    }
                }

                // ── Step 5.5: Components ────────────────────────────
                let componentIds: string[] = options.components || [];
                // Interactive only if components not provided and input allowed
                if (componentIds.length === 0 && !options.noInput) {
                    const compSpinner = ora('Fetching components...').start();
                    try {
                        const components = await api.get(API.PROJECT.COMPONENTS(projectKey));
                        compSpinner.stop();

                        if (Array.isArray(components) && components.length > 0) {
                            const { selectedComponents } = await enquirer.prompt({
                                type: 'multiselect',
                                name: 'selectedComponents',
                                message: 'Select Components (Space to select, Enter to confirm):',
                                choices: components.map((c: any) => ({ name: c.id, message: c.name }))
                            }) as any;
                            componentIds = selectedComponents;
                        }
                    } catch {
                        compSpinner.stop();
                    }
                }

                // ── Step 5.6: Labels ────────────────────────────────
                let labels: string[] = [];
                if (options.labels) {
                    labels = options.labels.split(',').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
                }

                if (labels.length === 0 && !options.noInput) {
                    const { inputLabels } = await enquirer.prompt({
                        type: 'input',
                        name: 'inputLabels',
                        message: 'Labels (comma-separated, optional):'
                    }) as any;

                    if (inputLabels && inputLabels.trim().length > 0) {
                        labels = inputLabels.split(',').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
                    }
                }

                // ── Step 5.7: Fix Versions ──────────────────────────
                let fixVersionIds: string[] = options.fixVersions || [];

                if (fixVersionIds.length === 0 && !options.noInput) {
                    const verSpinner = ora('Fetching versions...').start();
                    try {
                        const versions = await api.get(API.PROJECT.VERSIONS(projectKey));
                        verSpinner.stop();

                        // Filter unreleased versions usually
                        const unreleased = versions.filter((v: any) => !v.released);

                        if (Array.isArray(unreleased) && unreleased.length > 0) {
                            const { selectedVersions } = await enquirer.prompt({
                                type: 'multiselect',
                                name: 'selectedVersions',
                                message: 'Fix Versions:',
                                choices: unreleased.map((v: any) => ({ name: v.id, message: v.name }))
                            }) as any;
                            fixVersionIds = selectedVersions;
                        }
                    } catch {
                        verSpinner.stop();
                    }
                }

                // ── Step 5.8: Due Date ──────────────────────────────
                let duedate: string | null = options.dueDate || null;

                if (!duedate && !options.noInput) {
                    const { inputDueDate } = await enquirer.prompt({
                        type: 'input',
                        name: 'inputDueDate',
                        message: 'Due Date (YYYY-MM-DD, optional):',
                        validate: (val: string) => {
                            if (!val) return true;
                            return /^\d{4}-\d{2}-\d{2}$/.test(val) || 'Format must be YYYY-MM-DD';
                        }
                    }) as any;
                    if (inputDueDate) duedate = inputDueDate;
                }

                // ── Step 6: Assignee ────────────────────────────────
                let assigneeId = options.assignee;
                if (!assigneeId) {
                    const { assigneeChoice } = await enquirer.prompt({
                        type: 'select',
                        name: 'assigneeChoice',
                        message: 'Assign to:',
                        choices: [
                            { name: 'me', message: 'Myself' },
                            { name: 'unassigned', message: 'Leave Unassigned' },
                            { name: 'search', message: 'Search for a user...' }
                        ]
                    }) as any;

                    if (assigneeChoice === 'me') {
                        const spinner = ora('Fetching your account...').start();
                        try {
                            const myself = await api.get(API.USER.MYSELF);
                            assigneeId = myself.accountId;
                            spinner.stop();
                        } catch {
                            spinner.fail('Could not fetch your account. Leaving unassigned.');
                            assigneeId = null;
                        }
                    } else if (assigneeChoice === 'search') {
                        const { searchQuery } = await enquirer.prompt({
                            type: 'input',
                            name: 'searchQuery',
                            message: 'Search user by name or email:'
                        }) as any;

                        if (searchQuery.trim()) {
                            const spinner = ora('Searching users...').start();
                            try {
                                const users = await api.get(`${API.USER.SEARCH}?query=${encodeURIComponent(searchQuery)}`);
                                spinner.stop();

                                if (Array.isArray(users) && users.length > 0) {
                                    const userChoices = users.map((u: any) => ({
                                        name: u.accountId,
                                        message: `${u.displayName} (${u.emailAddress || u.accountId})`
                                    }));

                                    const { selectedUser } = await enquirer.prompt({
                                        type: 'select',
                                        name: 'selectedUser',
                                        message: 'Select User:',
                                        choices: userChoices
                                    }) as any;
                                    assigneeId = selectedUser;
                                } else {
                                    console.log(chalk.yellow('No users found. Leaving unassigned.'));
                                    assigneeId = null;
                                }
                            } catch {
                                spinner.fail('User search failed. Leaving unassigned.');
                                assigneeId = null;
                            }
                        }
                    } else {
                        assigneeId = null;
                    }
                } else if (assigneeId === 'me') {
                    // --assignee me flag: resolve to account ID
                    const spinner = ora('Fetching your account...').start();
                    try {
                        const myself = await api.get(API.USER.MYSELF);
                        assigneeId = myself.accountId;
                        spinner.stop();
                    } catch {
                        spinner.fail('Could not fetch your account. Leaving unassigned.');
                        assigneeId = null;
                    }
                }

                // ── Confirmation ────────────────────────────────────
                if (!options.noInput) {
                    console.log(chalk.blue('\n── Issue Summary ──────────────────'));
                    console.log(`  Project:     ${chalk.cyan(projectKey)}`);
                    console.log(`  Type:        ${issueTypeName}`);
                    console.log(`  Summary:     ${summary}`);
                    console.log(`  Description: ${description || chalk.grey('(none)')}`);
                    console.log(`  Priority:    ${priorityName || chalk.grey('(default)')}`);
                    console.log(`  Assignee:    ${assigneeId || chalk.grey('Unassigned')}`);
                    console.log(chalk.blue('──────────────────────────────────\n'));

                    const { confirmed } = await enquirer.prompt({
                        type: 'confirm',
                        name: 'confirmed',
                        message: 'Create this issue?',
                        initial: true
                    }) as any;

                    if (!confirmed) {
                        console.log(chalk.yellow('Issue creation cancelled.'));
                        return;
                    }
                }

                // ── Build Request Body ──────────────────────────────
                const issueBody: any = {
                    fields: {
                        project: { key: projectKey },
                        issuetype: { name: issueTypeName },
                        summary: summary
                    }
                };

                if (description) {
                    issueBody.fields.description = textToADF(description);
                }

                if (priorityName) {
                    issueBody.fields.priority = { name: priorityName };
                }

                if (assigneeId) {
                    issueBody.fields.assignee = { accountId: assigneeId };
                }

                if (componentIds.length > 0) {
                    issueBody.fields.components = componentIds.map(id => ({ id }));
                }

                if (labels.length > 0) {
                    issueBody.fields.labels = labels;
                }

                if (fixVersionIds.length > 0) {
                    issueBody.fields.fixVersions = fixVersionIds.map(id => ({ id }));
                }

                if (duedate) {
                    issueBody.fields.duedate = duedate;
                }

                // ── Step 5.9: Custom Fields ─────────────────────────
                if (options.custom && options.custom.length > 0) {
                    options.custom.forEach((cf: string) => {
                        const [key, ...rest] = cf.split('=');
                        const value = rest.join('=');
                        if (!key || !value) return;

                        const fieldId = ConfigService.get(`customFields.${key}`) || key;
                        const parsedValue = isNaN(Number(value)) ? value : Number(value);
                        issueBody.fields[fieldId] = parsedValue;
                    });
                }

                // ── Create Issue ────────────────────────────────────
                const spinner = ora('Creating issue...').start();
                const result = await api.post(API.ISSUE.BASE, issueBody);
                spinner.succeed(chalk.green(`Issue created: ${chalk.bold(result.key)}`));

                console.log(chalk.grey(`View it: jira issue view ${result.key}`));

            } catch (e: any) {
                handleCommandError(spinner, e, 'Failed to create issue');
            }
        });

    // ── TRANSITION ────────────────────────────────────────────────────
    issueCmd
        .command('transition')
        .description('Transition an issue to a new status')
        .argument('<issueKey>', 'Issue Key (e.g., PROJ-123)')
        .option('-s, --status <name>', 'Target status name (skips interactive selection)')
        .addHelpText('after', `
Examples:
  $ jira issue transition PROJ-123                     # Interactive
  $ jira issue transition PROJ-123 --status "In Progress"
  $ jira issue transition PROJ-123 -s Done
        `)
        .action(async (issueKey: string, options: any) => {
            const check = validateIssueKey(issueKey);
            if (!check.valid) { console.error(chalk.red(check.message)); return; }
            const spinner = ora(`Fetching transitions for ${issueKey}...`).start();
            try {
                // Fetch current issue to show context
                const issue = await api.get(`${API.ISSUE.GET(issueKey)}?fields=summary,status`);
                const currentStatus = issue.fields.status.name;

                // Fetch available transitions
                const transData = await api.get(API.ISSUE.TRANSITIONS(issueKey));
                spinner.stop();

                if (!transData.transitions || transData.transitions.length === 0) {
                    console.log(chalk.yellow(`No transitions available for ${issueKey} (current status: ${currentStatus}).`));
                    return;
                }

                console.log(chalk.bold(`\n${issue.key}: ${issue.fields.summary}`));
                console.log(chalk.grey(`Current Status: ${currentStatus}\n`));

                let targetTransition;

                if (options.status) {
                    // Non-interactive: find matching transition
                    targetTransition = transData.transitions.find(
                        (t: any) => t.name.toLowerCase() === options.status.toLowerCase() ||
                            t.to.name.toLowerCase() === options.status.toLowerCase()
                    );

                    if (!targetTransition) {
                        console.error(chalk.red(`Status "${options.status}" is not a valid transition from "${currentStatus}".`));
                        console.log(chalk.grey('Available transitions:'));
                        transData.transitions.forEach((t: any) => {
                            console.log(chalk.grey(`  • ${t.name} → ${t.to.name}`));
                        });
                        return;
                    }
                } else {
                    // Interactive: show selection
                    const transitionChoices = transData.transitions.map((t: any) => ({
                        name: t.id,
                        message: `${t.name} → ${chalk.cyan(t.to.name)}`
                    }));

                    const { selectedTransition } = await enquirer.prompt({
                        type: 'select',
                        name: 'selectedTransition',
                        message: 'Select transition:',
                        choices: transitionChoices
                    }) as any;

                    targetTransition = transData.transitions.find((t: any) => t.id === selectedTransition);
                }

                // Execute transition
                const execSpinner = ora(`Transitioning to "${targetTransition.to.name}"...`).start();
                await api.post(API.ISSUE.TRANSITIONS(issueKey), {
                    transition: { id: targetTransition.id }
                });
                execSpinner.succeed(chalk.green(`${issueKey} transitioned: ${currentStatus} → ${chalk.bold(targetTransition.to.name)}`));

            } catch (e: any) {
                handleCommandError(spinner, e, 'Failed to transition issue');
            }
        });
    // ── ASSIGN ────────────────────────────────────────────────────────
    issueCmd
        .command('assign')
        .description('Assign or reassign an issue')
        .argument('<issueKey>', 'Issue Key (e.g., PROJ-123)')
        .option('-a, --assignee <id>', 'Assignee account ID (use "me" for self, "none" to unassign)')
        .addHelpText('after', `
Examples:
  $ jira issue assign PROJ-123             # Interactive
  $ jira issue assign PROJ-123 -a me       # Assign to yourself
  $ jira issue assign PROJ-123 -a none     # Unassign
        `)
        .action(async (issueKey: string, options: any) => {
            const check = validateIssueKey(issueKey);
            if (!check.valid) { console.error(chalk.red(check.message)); return; }
            let spinner: any = null;
            try {
                let assigneeId = options.assignee;

                if (!assigneeId) {
                    // Interactive selection
                    const spinner = ora(`Fetching issue ${issueKey}...`).start();
                    const issue = await api.get(`${API.ISSUE.GET(issueKey)}?fields=summary,assignee`);
                    spinner.stop();

                    const currentAssignee = issue.fields.assignee?.displayName || 'Unassigned';
                    console.log(chalk.bold(`\n${issue.key}: ${issue.fields.summary}`));
                    console.log(chalk.grey(`Current Assignee: ${currentAssignee}\n`));

                    const { assignChoice } = await enquirer.prompt({
                        type: 'select',
                        name: 'assignChoice',
                        message: 'Assign to:',
                        choices: [
                            { name: 'me', message: 'Myself' },
                            { name: 'none', message: 'Unassign' },
                            { name: 'search', message: 'Search for a user...' }
                        ]
                    }) as any;
                    assigneeId = assignChoice;
                }

                if (assigneeId === 'me') {
                    const spinner = ora('Fetching your account...').start();
                    const myself = await api.get(API.USER.MYSELF);
                    assigneeId = myself.accountId;
                    spinner.stop();
                }

                if (assigneeId === 'search') {
                    const { searchQuery } = await enquirer.prompt({
                        type: 'input',
                        name: 'searchQuery',
                        message: 'Search user by name or email:'
                    }) as any;

                    const spinner = ora('Searching users...').start();
                    const users = await api.get(`${API.USER.SEARCH}?query=${encodeURIComponent(searchQuery)}`);
                    spinner.stop();

                    if (!Array.isArray(users) || users.length === 0) {
                        console.log(chalk.yellow('No users found.'));
                        return;
                    }

                    const { selectedUser } = await enquirer.prompt({
                        type: 'select',
                        name: 'selectedUser',
                        message: 'Select User:',
                        choices: users.map((u: any) => ({
                            name: u.accountId,
                            message: `${u.displayName} (${u.emailAddress || u.accountId})`
                        }))
                    }) as any;
                    assigneeId = selectedUser;
                }

                const spinner = ora('Updating assignee...').start();
                const body = assigneeId === 'none'
                    ? { accountId: null }
                    : { accountId: assigneeId };

                await api.put(API.ISSUE.ASSIGNEE(issueKey), body);
                spinner.succeed(chalk.green(`${issueKey} ${assigneeId === 'none' ? 'unassigned' : 'assigned'} successfully.`));

            } catch (e: any) {
                handleCommandError(spinner, e, 'Failed to assign issue');
            }
        });

    // ── COMMENT ───────────────────────────────────────────────────────
    issueCmd
        .command('comment')
        .description('Add a comment to an issue')
        .argument('<issueKey>', 'Issue Key (e.g., PROJ-123)')
        .option('-m, --message <text>', 'Comment text (skips interactive prompt)')
        .addHelpText('after', `
Examples:
  $ jira issue comment PROJ-123                           # Interactive
  $ jira issue comment PROJ-123 -m "Fixed in latest build"
        `)
        .action(async (issueKey: string, options: any) => {
            const check = validateIssueKey(issueKey);
            if (!check.valid) { console.error(chalk.red(check.message)); return; }
            let spinner: any = null;
            try {
                let commentText = options.message;

                if (!commentText) {
                    // Show issue context first
                    const spinner = ora(`Fetching issue ${issueKey}...`).start();
                    const issue = await api.get(`/issue/${issueKey}?fields=summary,status`);
                    spinner.stop();

                    console.log(chalk.bold(`\n${issue.key}: ${issue.fields.summary}`));
                    console.log(chalk.grey(`Status: ${issue.fields.status.name}\n`));

                    const { inputComment } = await enquirer.prompt({
                        type: 'input',
                        name: 'inputComment',
                        message: 'Enter your comment:',
                        validate: (val: any) => val.trim().length > 0 || 'Comment cannot be empty'
                    }) as any;
                    commentText = inputComment;
                }

                const spinner = ora('Adding comment...').start();
                await api.post(API.ISSUE.COMMENT(issueKey), {
                    body: textToADF(commentText)
                });
                spinner.succeed(chalk.green(`Comment added to ${issueKey}.`));

            } catch (e: any) {
                handleCommandError(spinner, e, 'Failed to add comment');
            }
        });

    // ── EDIT ──────────────────────────────────────────────────────────
    issueCmd
        .command('edit')
        .description('Edit issue fields')
        .argument('<issueKey>', 'Issue Key (e.g., PROJ-123)')
        .option('-s, --summary <text>', 'New summary')
        .option('-d, --description <text>', 'New description')
        .option('--priority <name>', 'New priority')
        .addHelpText('after', `
Examples:
  $ jira issue edit PROJ-123                         # Interactive field picker
  $ jira issue edit PROJ-123 -s "Updated title"
  $ jira issue edit PROJ-123 --priority High
  $ jira issue edit PROJ-123 -d "New description"
        `)
        .action(async (issueKey: string, options: any) => {
            const check = validateIssueKey(issueKey);
            if (!check.valid) { console.error(chalk.red(check.message)); return; }
            const spinner = ora(`Fetching issue ${issueKey}...`).start();
            try {
                const issue = await api.get(`${API.ISSUE.GET(issueKey)}?fields=summary,description,priority`);
                spinner.stop();

                const updateBody: any = { fields: {} };
                const hasFlags = options.summary || options.description || options.priority || (options.custom && options.custom.length > 0);

                if (hasFlags) {
                    if (options.summary) updateBody.fields.summary = options.summary;
                    if (options.description) updateBody.fields.description = textToADF(options.description);
                    if (options.priority) updateBody.fields.priority = { name: options.priority };

                    if (options.custom && options.custom.length > 0) {
                        options.custom.forEach((cf: string) => {
                            const [key, ...rest] = cf.split('=');
                            const value = rest.join('=');
                            if (!key || !value) return;

                            const fieldId = ConfigService.get(`customFields.${key}`) || key;
                            const parsedValue = isNaN(Number(value)) ? value : Number(value);
                            updateBody.fields[fieldId] = parsedValue;
                        });
                    }
                } else {
                    // Interactive: pick which fields to edit
                    console.log(chalk.bold(`\nEditing ${chalk.cyan(issueKey)}: ${issue.fields.summary}\n`));

                    const { Select, Input } = enquirer as any;

                    const fieldSelect = new Select({
                        name: 'fields',
                        message: 'Select fields to edit',
                        choices: [
                            { name: 'summary', message: `Summary: ${issue.fields.summary}` },
                            { name: 'description', message: 'Description' },
                            { name: 'priority', message: `Priority: ${issue.fields.priority?.name || 'None'}` },
                            { name: 'components', message: `Components: ${(issue.fields.components || []).map((c: any) => c.name).join(', ')}` },
                            { name: 'labels', message: `Labels: ${(issue.fields.labels || []).join(', ')}` }
                        ],
                        multiple: true
                    });
                    const selectedFields = await fieldSelect.run();

                    if (!selectedFields || selectedFields.length === 0) {
                        console.log(chalk.yellow('No fields selected.'));
                        return;
                    }

                    for (const field of selectedFields) {
                        if (field === 'summary') {
                            const prompt = new Input({ message: 'New summary', initial: issue.fields.summary });
                            updateBody.fields.summary = await prompt.run();
                        }
                        if (field === 'description') {
                            const prompt = new Input({ message: 'New description' });
                            const desc = await prompt.run();
                            if (desc) updateBody.fields.description = textToADF(desc);
                        }
                        if (field === 'priority') {
                            const priorities = await api.get(API.PRIORITY.ALL);
                            const prioSelect = new Select({
                                name: 'priority',
                                message: 'Select priority',
                                choices: priorities.map((p: any) => ({ name: p.name, message: p.name }))
                            });
                            updateBody.fields.priority = { name: await prioSelect.run() };
                        }
                        if (field === 'components') {
                            const components = await api.get(API.PROJECT.COMPONENTS(issue.fields.project.key));
                            if (components.length > 0) {
                                const compSelect = new Select({ // Using Enquirer directly via 'any' above, but actually Select is single select? 
                                    // Wait, fieldSelect was initialized from enquirer as any. 
                                    // Multiselect is needed here.
                                    name: 'components',
                                    message: 'Select components',
                                    multiple: true,
                                    choices: components.map((c: any) => ({ name: c.id, message: c.name, enabled: (issue.fields.components || []).some((ic: any) => ic.id === c.id) }))
                                });
                                // Enquirer 'Select' with 'multiple: true' is actually 'MultiSelect'? No, standard Enquirer has 'MultiSelect'.
                                // We cast enquirer to any so we can check if MultiSelect exists or use Select with multiple: true (which might not work in all versions).
                                // Let's try to use 'MultiSelect' if available, or 'Select' with multiple.
                                // Actually, in step 5.5 I used type: 'multiselect'. Here I am instantiating classes.
                                // Let's use the prompt method for consistency.
                                const { selectedComps } = await enquirer.prompt({
                                    type: 'multiselect',
                                    name: 'selectedComps',
                                    message: 'Select Components:',
                                    choices: components.map((c: any) => ({
                                        name: c.id,
                                        message: c.name,
                                        initial: (issue.fields.components || []).some((ic: any) => ic.id === c.id) // Enquirer uses 'initial' or 'enabled'? Checks docs... usually 'initial' for multiselect is index or name list? 
                                        // Simple approach: Pre-select not easy without specific logic. 
                                        // Let's just show the list.
                                    }))
                                }) as any;
                                updateBody.fields.components = selectedComps.map((id: string) => ({ id }));
                            }
                        }
                        if (field === 'labels') {
                            const prompt = new Input({ message: 'New labels (comma separated)', initial: (issue.fields.labels || []).join(', ') });
                            const labelStr = await prompt.run();
                            updateBody.fields.labels = labelStr.split(',').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
                        }
                        if (field === 'fixVersions') {
                            const versions = await api.get(API.PROJECT.VERSIONS(issue.fields.project.key));
                            const unreleased = versions.filter((v: any) => !v.released);
                            if (unreleased.length > 0) {
                                const { selectedVersions } = await enquirer.prompt({
                                    type: 'multiselect',
                                    name: 'selectedVersions',
                                    message: 'Select Fix Versions:',
                                    choices: unreleased.map((v: any) => ({ name: v.id, message: v.name }))
                                }) as any;
                                updateBody.fields.fixVersions = selectedVersions.map((id: string) => ({ id }));
                            }
                        }
                        if (field === 'duedate') {
                            const prompt = new Input({
                                message: 'Due Date (YYYY-MM-DD)',
                                initial: issue.fields.duedate,
                                validate: (val: string) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val) || 'Format must be YYYY-MM-DD'
                            });
                            const date = await prompt.run();
                            updateBody.fields.duedate = date || null;
                        }
                    }
                }

                if (Object.keys(updateBody.fields).length === 0) {
                    console.log(chalk.yellow('No changes specified.'));
                    return;
                }

                const updateSpinner = ora('Updating issue...').start();
                await api.put(API.ISSUE.GET(issueKey), updateBody);
                updateSpinner.succeed(`${chalk.cyan(issueKey)} updated successfully`);

            } catch (e: any) {
                handleCommandError(spinner, e, `Failed to edit ${issueKey}`);
            }
        });

    // ── SEARCH ────────────────────────────────────────────────────────
    issueCmd
        .command('search')
        .description('Quick text search across issues')
        .argument('<query>', 'Search text')
        .option('-p, --project <key>', 'Filter by project')
        .option('-l, --limit <n>', 'Max results', '15')
        .option('-o, --output <format>', 'Output format (json)')
        .addHelpText('after', `
Examples:
  $ jira issue search "login bug"
  $ jira issue search "payment" -p PROJ
  $ jira issue search "crash" --output json
        `)
        .action(async (query: string, options: any) => {
            const spinner = ora(`Searching for "${query}"...`).start();
            try {
                const jqlParts = [`text ~ "${query.replace(/"/g, '\\"')}"`];
                if (options.project) jqlParts.push(`project = "${options.project}"`);
                const jql = jqlParts.join(' AND ') + ' ORDER BY updated DESC';

                const data = await api.post(API.SEARCH.JQL, {
                    jql,
                    maxResults: parseInt(options.limit),
                    fields: ['summary', 'status', 'assignee', 'updated']
                });
                spinner.stop();

                if (!data.issues || data.issues.length === 0) {
                    console.log(chalk.yellow('No issues found.'));
                    return;
                }

                if (options.output === 'json') {
                    console.log(JSON.stringify(data.issues.map((i: any) => ({
                        key: i.key, summary: i.fields.summary,
                        status: i.fields.status?.name, assignee: i.fields.assignee?.displayName || null,
                        updated: i.fields.updated
                    })), null, 2));
                    return;
                }

                const table = new Table({
                    columns: [
                        { name: chalk.bold('Key') },
                        { name: chalk.bold('Summary') },
                        { name: chalk.bold('Status') },
                        { name: chalk.bold('Assignee') }
                    ]
                });
                data.issues.forEach((i: any) => {
                    table.addRow([
                        chalk.cyan(i.key),
                        i.fields.summary ? (i.fields.summary.length > 55 ? i.fields.summary.substring(0, 52) + '...' : i.fields.summary) : '',
                        i.fields.status?.name || '',
                        i.fields.assignee?.displayName || 'Unassigned'
                    ]);
                });
                console.log(table.render());
                console.log(chalk.grey(`Found ${data.issues.length} result(s)`));

            } catch (e) {
                handleCommandError(spinner, e, 'Search failed');
            }
        });

    // ── LINK ──────────────────────────────────────────────────────────
    issueCmd
        .command('link')
        .description('Link two issues together')
        .argument('<sourceKey>', 'Source issue key')
        .argument('<targetKey>', 'Target issue key')
        .option('-t, --type <name>', 'Link type (e.g., "Blocks", "Relates")')
        .addHelpText('after', `
Examples:
  $ jira issue link PROJ-1 PROJ-2                # Interactive type selection
  $ jira issue link PROJ-1 PROJ-2 -t "Blocks"
  $ jira issue link PROJ-1 PROJ-2 -t "Relates"
        `)
        .action(async (sourceKey, targetKey, options) => {
            const srcCheck = validateIssueKey(sourceKey);
            if (!srcCheck.valid) { console.error(chalk.red(srcCheck.message)); return; }
            const tgtCheck = validateIssueKey(targetKey);
            if (!tgtCheck.valid) { console.error(chalk.red(tgtCheck.message)); return; }

            try {
                let linkType = options.type;

                if (!linkType) {
                    const spinner = ora('Fetching link types...').start();
                    const linkTypes = await api.get('/issueLinkType');
                    spinner.stop();

                    const { Select } = enquirer as any;
                    const typeSelect = new Select({
                        name: 'linkType',
                        message: `Link type: ${chalk.cyan(sourceKey)} → ${chalk.cyan(targetKey)}`,
                        choices: linkTypes.issueLinkTypes.map((lt: any) => ({
                            name: lt.name,
                            message: `${lt.name} (${lt.inward} / ${lt.outward})`
                        }))
                    });
                    linkType = await typeSelect.run();
                }

                const spinner = ora(`Linking ${sourceKey} → ${targetKey}...`).start();
                await api.post('/issueLink', {
                    type: { name: linkType },
                    inwardIssue: { key: sourceKey },
                    outwardIssue: { key: targetKey }
                });
                spinner.succeed(`Linked ${chalk.cyan(sourceKey)} ${chalk.grey(`—[${linkType}]→`)} ${chalk.cyan(targetKey)}`);

            } catch (e) {
                handleCommandError(null, e, `Failed to link issues`);
            }
        });

    // ── WATCH ─────────────────────────────────────────────────────────
    issueCmd
        .command('watch')
        .description('Start watching an issue')
        .argument('<issueKey>', 'Issue Key')
        .action(async (issueKey) => {
            const check = validateIssueKey(issueKey);
            if (!check.valid) { console.error(chalk.red(check.message)); return; }
            const spinner = ora(`Watching ${issueKey}...`).start();
            try {
                await api.post(`/issue/${issueKey}/watchers`, null);
                spinner.succeed(`Now watching ${chalk.cyan(issueKey)}`);
            } catch (e) {
                handleCommandError(spinner, e, `Failed to watch ${issueKey}`);
            }
        });

    // ── UNWATCH ───────────────────────────────────────────────────────
    issueCmd
        .command('unwatch')
        .description('Stop watching an issue')
        .argument('<issueKey>', 'Issue Key')
        .action(async (issueKey) => {
            const check = validateIssueKey(issueKey);
            if (!check.valid) { console.error(chalk.red(check.message)); return; }
            const spinner = ora(`Unwatching ${issueKey}...`).start();
            try {
                const me = await api.get('/myself');
                await api.delete(`/issue/${issueKey}/watchers?accountId=${me.accountId}`);
                spinner.succeed(`Stopped watching ${chalk.cyan(issueKey)}`);
            } catch (e) {
                handleCommandError(spinner, e, `Failed to unwatch ${issueKey}`);
            }
        });

    // ── SUBTASK ───────────────────────────────────────────────────────
    issueCmd
        .command('subtask')
        .description('Create a subtask for an existing issue')
        .argument('<parentKey>', 'Parent Issue Key')
        .option('-s, --summary <text>', 'Subtask summary')
        .option('--priority <name>', 'Priority')
        .option('-a, --assignee <id>', 'Assignee')
        .addHelpText('after', `
Examples:
  $ jira issue subtask PROJ-123                        # Interactive
  $ jira issue subtask PROJ-123 -s "Dev task"
        `)
        .action(async (parentKey: string, options: any) => {
            const check = validateIssueKey(parentKey);
            if (!check.valid) { console.error(chalk.red(check.message)); return; }

            const spinner = ora(`Fetching parent ${parentKey}...`).start();
            try {
                const parent = await api.get(`/issue/${parentKey}?fields=project,summary,issuetype,id`);
                const projectKey = parent.fields.project.key;

                if (parent.fields.issuetype.subtask) {
                    spinner.fail(chalk.red(`Issue ${parentKey} is already a subtask. Cannot create a subtask of a subtask.`));
                    return;
                }

                if (parent.fields.issuetype.name === 'Epic') {
                    spinner.fail(chalk.red(`Issue ${parentKey} is an Epic. Epics cannot have sub-tasks.`));
                    console.log(chalk.yellow('Tip: To add work to an Epic, create a standard issue (Story, Task) and link it to the Epic.'));
                    return;
                }

                spinner.text = 'Fetching subtask types...';

                // Get valid subtask types for project
                let subtaskTypes: any[] = [];
                try {
                    // Correct V3 endpoint for creation metadata
                    const meta = await api.get(`/issue/createmeta?projectKeys=${projectKey}`);
                    if (meta.projects && meta.projects.length > 0) {
                        subtaskTypes = meta.projects[0].issuetypes.filter((t: any) => t.subtask);
                    }
                } catch (err) {
                    // Fallback to project fetch
                    try {
                        const proj = await api.get(API.PROJECT.GET(projectKey));
                        subtaskTypes = (proj.issueTypes || []).filter((t: any) => t.subtask);
                    } catch (e) {
                        console.error(chalk.red('Failed to fetch project issue types.'));
                    }
                }
                spinner.stop();

                if (subtaskTypes.length === 0) {
                    console.error(chalk.red(`No subtask types found in project ${projectKey}.`));
                    return;
                }

                console.log(chalk.bold(`\nParent: ${chalk.cyan(parentKey)} ${parent.fields.summary}`));

                let subtaskTypeId = subtaskTypes[0].id;
                if (subtaskTypes.length > 1) {
                    const { selectedType } = await enquirer.prompt({
                        type: 'select',
                        name: 'selectedType',
                        message: 'Select Subtask Type:',
                        choices: subtaskTypes.map((t: any) => ({ name: t.id, message: t.name }))
                    }) as any;
                    subtaskTypeId = selectedType;
                }

                let summary = options.summary;
                if (!summary) {
                    const { inputSummary } = await enquirer.prompt({
                        type: 'input',
                        name: 'inputSummary',
                        message: 'Subtask Summary:',
                        validate: (val: string) => val.trim().length > 0 || 'Summary required'
                    }) as any;
                    summary = inputSummary;
                }

                // Optional: Priority
                let priorityName = options.priority;
                // Optional: Assignee
                let assigneeId = options.assignee;

                const issueBody: any = {
                    fields: {
                        project: { key: projectKey },
                        parent: { id: parent.id }, // Use ID instead of Key
                        issuetype: { id: subtaskTypeId },
                        summary: summary
                    }
                };

                if (priorityName) issueBody.fields.priority = { name: priorityName };
                // ... rest of assignee logic ...

                if (assigneeId === 'me') {
                    const me = await api.get('/myself');
                    issueBody.fields.assignee = { accountId: me.accountId };
                } else if (assigneeId) {
                    issueBody.fields.assignee = { accountId: assigneeId };
                }

                const createSpinner = ora('Creating subtask...').start();
                const result = await api.post(API.ISSUE.BASE, issueBody);
                createSpinner.succeed(chalk.green(`Subtask created: ${chalk.bold(result.key)}`));

            } catch (e: any) {
                handleCommandError(spinner, e, 'Failed to create subtask');
            }
        });



    registerWorklogCommand(issueCmd);
    registerPrCommand(issueCmd);
    registerAttachCommand(issueCmd);

    program.addCommand(issueCmd);
}
