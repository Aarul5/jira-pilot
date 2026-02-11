import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { api } from '../services/api-service.js';
import { aiService } from '../services/ai-service.js';
import ora from 'ora';
import enquirer from 'enquirer';
import { parseADF } from '../utils/adf-parser.js';
import { textToADF } from '../utils/text-to-adf.js';
import { validateIssueKey } from '../utils/validators.js';
import { handleCommandError } from '../utils/error-handler.js';

export function registerIssueCommand(program) {
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
        .action(async (options) => {
            const spinner = ora('Fetching issues...').start();
            try {
                // Natural Language JQL
                if (options.ask) {
                    const aiSpinner = ora(`Translating query: "${options.ask}"...`).start();
                    try {
                        const generatedJql = await aiService.generateJql(options.ask);
                        aiSpinner.succeed(`JQL: ${chalk.cyan(generatedJql)}`);
                        options.jql = generatedJql; // Override/Set JQL
                    } catch (e) {
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
                if (!options.jql && jqlParts.length === 0) {
                    jqlParts.push('order by updated DESC');
                } else if (jqlParts.length > 0 && !options.jql) {
                    // Add order if not custom jql
                    // jqlParts.push('order by updated DESC');
                }

                const jql = jqlParts.join(' AND ');

                const searchApi = '/search/jql';
                const body = {
                    jql: jql || 'created is not empty',
                    maxResults: parseInt(options.limit),
                    fields: ['summary', 'status', 'assignee', 'created', 'updated', 'description']
                };

                const data = await api.post(searchApi, body);
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

                        data.issues.forEach(i => {
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
                    console.log(JSON.stringify(data.issues.map(i => ({
                        key: i.key, summary: i.fields.summary,
                        status: i.fields.status?.name, assignee: i.fields.assignee?.displayName || null,
                        created: i.fields.created, updated: i.fields.updated
                    })), null, 2));
                    return;
                }

                const table = new Table({
                    head: [chalk.bold('Key'), chalk.bold('Summary'), chalk.bold('Status'), chalk.bold('Assignee'), chalk.bold('Created'), chalk.bold('Updated')]
                });

                data.issues.forEach(i => {
                    table.push([
                        chalk.cyan(i.key),
                        i.fields.summary ? (i.fields.summary.length > 50 ? i.fields.summary.substring(0, 47) + '...' : i.fields.summary) : '',
                        i.fields.status ? i.fields.status.name : '',
                        i.fields.assignee ? i.fields.assignee.displayName : 'Unassigned',
                        i.fields.created ? i.fields.created.split('T')[0] : '',
                        i.fields.updated ? i.fields.updated.split('T')[0] : ''
                    ]);
                });

                console.log(table.toString());

            } catch (e) {
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
        .action(async (issueKey, options) => {
            const check = validateIssueKey(issueKey);
            if (!check.valid) { console.error(chalk.red(check.message)); return; }
            const spinner = ora(`Fetching issue ${issueKey}...`).start();
            try {
                const issue = await api.get(`/issue/${issueKey}`);
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

                if (issue.fields.comment && issue.fields.comment.comments.length > 0) {
                    console.log(chalk.bold('\nComments:'));
                    issue.fields.comment.comments.forEach(c => {
                        console.log(chalk.cyan(c.author.displayName) + ': ' + c.body);
                    });
                }
                console.log('');
            } catch (e) {
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
        .addHelpText('after', `
Examples:
  $ jira issue create                                    # Interactive wizard
  $ jira issue create -p PROJ -s "Fix login bug"         # Quick create
  $ jira issue create -p PROJ -t Bug -s "Crash on save" --priority High
  $ jira issue create -p PROJ -s "New feature" -a me
        `)
        .action(async (options) => {
            try {
                // ── Step 1: Select Project ──────────────────────────
                let projectKey = options.project;
                if (!projectKey) {
                    const spinner = ora('Fetching projects...').start();
                    const projectData = await api.get('/project/search');
                    spinner.stop();

                    if (!projectData.values || projectData.values.length === 0) {
                        console.error(chalk.red('No projects found. Check your permissions.'));
                        return;
                    }

                    const projectChoices = projectData.values.map(p => ({
                        name: p.key,
                        message: `${p.key} — ${p.name}`
                    }));

                    const { selectedProject } = await enquirer.prompt({
                        type: 'select',
                        name: 'selectedProject',
                        message: 'Select Project:',
                        choices: projectChoices
                    });
                    projectKey = selectedProject;
                }

                // ── Step 2: Select Issue Type ───────────────────────
                let issueTypeName = options.type;
                if (!issueTypeName) {
                    const spinner = ora('Fetching issue types...').start();
                    let issueTypes = [];
                    try {
                        // Jira Cloud v3 - createmeta endpoint
                        const metaData = await api.get(`/issue/createmeta/${projectKey}/issuetypes`);
                        issueTypes = metaData.issueTypes || metaData.values || [];
                    } catch (metaErr) {
                        // Fallback: use project-level issue types
                        try {
                            const projectInfo = await api.get(`/project/${projectKey}`);
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
                    const filteredTypes = issueTypes.filter(t => !t.subtask);
                    const typeChoices = (filteredTypes.length > 0 ? filteredTypes : issueTypes)
                        .map(t => ({ name: t.name, message: t.name }));

                    const { selectedType } = await enquirer.prompt({
                        type: 'select',
                        name: 'selectedType',
                        message: 'Select Issue Type:',
                        choices: typeChoices
                    });
                    issueTypeName = selectedType;
                }

                // ── Step 3: Summary (required) ──────────────────────
                let summary = options.summary;
                if (!summary) {
                    const { inputSummary } = await enquirer.prompt({
                        type: 'input',
                        name: 'inputSummary',
                        message: 'Summary (required):',
                        validate: (val) => val.trim().length > 0 || 'Summary cannot be empty'
                    });
                    summary = inputSummary;
                }

                // ── Step 4: Description (optional) ──────────────────
                let description = options.description;
                if (description === undefined) {
                    const { inputDescription } = await enquirer.prompt({
                        type: 'input',
                        name: 'inputDescription',
                        message: 'Description (optional, press Enter to skip):'
                    });
                    description = inputDescription || null;
                }

                // ── Step 5: Priority ────────────────────────────────
                let priorityName = options.priority;
                if (!priorityName) {
                    const spinner = ora('Fetching priorities...').start();
                    try {
                        const priorities = await api.get('/priority');
                        spinner.stop();

                        if (Array.isArray(priorities) && priorities.length > 0) {
                            const priorityChoices = priorities.map(p => ({
                                name: p.name,
                                message: p.name
                            }));

                            const { selectedPriority } = await enquirer.prompt({
                                type: 'select',
                                name: 'selectedPriority',
                                message: 'Select Priority:',
                                choices: priorityChoices
                            });
                            priorityName = selectedPriority;
                        }
                    } catch {
                        spinner.stop();
                        // Priority endpoint may not be available; skip
                    }
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
                    });

                    if (assigneeChoice === 'me') {
                        const spinner = ora('Fetching your account...').start();
                        try {
                            const myself = await api.get('/myself');
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
                        });

                        if (searchQuery.trim()) {
                            const spinner = ora('Searching users...').start();
                            try {
                                const users = await api.get(`/user/search?query=${encodeURIComponent(searchQuery)}`);
                                spinner.stop();

                                if (Array.isArray(users) && users.length > 0) {
                                    const userChoices = users.map(u => ({
                                        name: u.accountId,
                                        message: `${u.displayName} (${u.emailAddress || u.accountId})`
                                    }));

                                    const { selectedUser } = await enquirer.prompt({
                                        type: 'select',
                                        name: 'selectedUser',
                                        message: 'Select User:',
                                        choices: userChoices
                                    });
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
                        const myself = await api.get('/myself');
                        assigneeId = myself.accountId;
                        spinner.stop();
                    } catch {
                        spinner.fail('Could not fetch your account. Leaving unassigned.');
                        assigneeId = null;
                    }
                }

                // ── Confirmation ────────────────────────────────────
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
                });

                if (!confirmed) {
                    console.log(chalk.yellow('Issue creation cancelled.'));
                    return;
                }

                // ── Build Request Body ──────────────────────────────
                const issueBody = {
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

                // ── Create Issue ────────────────────────────────────
                const spinner = ora('Creating issue...').start();
                const result = await api.post('/issue', issueBody);
                spinner.succeed(chalk.green(`Issue created: ${chalk.bold(result.key)}`));

                console.log(chalk.grey(`View it: jira issue view ${result.key}`));

            } catch (e) {
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
        .action(async (issueKey, options) => {
            const check = validateIssueKey(issueKey);
            if (!check.valid) { console.error(chalk.red(check.message)); return; }
            const spinner = ora(`Fetching transitions for ${issueKey}...`).start();
            try {
                // Fetch current issue to show context
                const issue = await api.get(`/issue/${issueKey}?fields=summary,status`);
                const currentStatus = issue.fields.status.name;

                // Fetch available transitions
                const transData = await api.get(`/issue/${issueKey}/transitions`);
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
                        t => t.name.toLowerCase() === options.status.toLowerCase() ||
                            t.to.name.toLowerCase() === options.status.toLowerCase()
                    );

                    if (!targetTransition) {
                        console.error(chalk.red(`Status "${options.status}" is not a valid transition from "${currentStatus}".`));
                        console.log(chalk.grey('Available transitions:'));
                        transData.transitions.forEach(t => {
                            console.log(chalk.grey(`  • ${t.name} → ${t.to.name}`));
                        });
                        return;
                    }
                } else {
                    // Interactive: show selection
                    const transitionChoices = transData.transitions.map(t => ({
                        name: t.id,
                        message: `${t.name} → ${chalk.cyan(t.to.name)}`
                    }));

                    const { selectedTransition } = await enquirer.prompt({
                        type: 'select',
                        name: 'selectedTransition',
                        message: 'Select transition:',
                        choices: transitionChoices
                    });

                    targetTransition = transData.transitions.find(t => t.id === selectedTransition);
                }

                // Execute transition
                const execSpinner = ora(`Transitioning to "${targetTransition.to.name}"...`).start();
                await api.post(`/issue/${issueKey}/transitions`, {
                    transition: { id: targetTransition.id }
                });
                execSpinner.succeed(chalk.green(`${issueKey} transitioned: ${currentStatus} → ${chalk.bold(targetTransition.to.name)}`));

            } catch (e) {
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
        .action(async (issueKey, options) => {
            const check = validateIssueKey(issueKey);
            if (!check.valid) { console.error(chalk.red(check.message)); return; }
            try {
                let assigneeId = options.assignee;

                if (!assigneeId) {
                    // Interactive selection
                    const spinner = ora(`Fetching issue ${issueKey}...`).start();
                    const issue = await api.get(`/issue/${issueKey}?fields=summary,assignee`);
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
                    });
                    assigneeId = assignChoice;
                }

                if (assigneeId === 'me') {
                    const spinner = ora('Fetching your account...').start();
                    const myself = await api.get('/myself');
                    assigneeId = myself.accountId;
                    spinner.stop();
                }

                if (assigneeId === 'search') {
                    const { searchQuery } = await enquirer.prompt({
                        type: 'input',
                        name: 'searchQuery',
                        message: 'Search user by name or email:'
                    });

                    const spinner = ora('Searching users...').start();
                    const users = await api.get(`/user/search?query=${encodeURIComponent(searchQuery)}`);
                    spinner.stop();

                    if (!Array.isArray(users) || users.length === 0) {
                        console.log(chalk.yellow('No users found.'));
                        return;
                    }

                    const { selectedUser } = await enquirer.prompt({
                        type: 'select',
                        name: 'selectedUser',
                        message: 'Select User:',
                        choices: users.map(u => ({
                            name: u.accountId,
                            message: `${u.displayName} (${u.emailAddress || u.accountId})`
                        }))
                    });
                    assigneeId = selectedUser;
                }

                const spinner = ora('Updating assignee...').start();
                const body = assigneeId === 'none'
                    ? { accountId: null }
                    : { accountId: assigneeId };

                await api.put(`/issue/${issueKey}/assignee`, body);
                spinner.succeed(chalk.green(`${issueKey} ${assigneeId === 'none' ? 'unassigned' : 'assigned'} successfully.`));

            } catch (e) {
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
        .action(async (issueKey, options) => {
            const check = validateIssueKey(issueKey);
            if (!check.valid) { console.error(chalk.red(check.message)); return; }
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
                        validate: (val) => val.trim().length > 0 || 'Comment cannot be empty'
                    });
                    commentText = inputComment;
                }

                const spinner = ora('Adding comment...').start();
                await api.post(`/issue/${issueKey}/comment`, {
                    body: textToADF(commentText)
                });
                spinner.succeed(chalk.green(`Comment added to ${issueKey}.`));

            } catch (e) {
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
        .action(async (issueKey, options) => {
            const check = validateIssueKey(issueKey);
            if (!check.valid) { console.error(chalk.red(check.message)); return; }
            const spinner = ora(`Fetching issue ${issueKey}...`).start();
            try {
                const issue = await api.get(`/issue/${issueKey}?fields=summary,description,priority`);
                spinner.stop();

                const updateBody = { fields: {} };
                const hasFlags = options.summary || options.description || options.priority;

                if (hasFlags) {
                    if (options.summary) updateBody.fields.summary = options.summary;
                    if (options.description) updateBody.fields.description = textToADF(options.description);
                    if (options.priority) updateBody.fields.priority = { name: options.priority };
                } else {
                    // Interactive: pick which fields to edit
                    console.log(chalk.bold(`\nEditing ${chalk.cyan(issueKey)}: ${issue.fields.summary}\n`));

                    const { Select, Input } = enquirer;

                    const fieldSelect = new Select({
                        name: 'fields',
                        message: 'Select fields to edit',
                        choices: [
                            { name: 'summary', message: `Summary: ${issue.fields.summary}` },
                            { name: 'description', message: 'Description' },
                            { name: 'priority', message: `Priority: ${issue.fields.priority?.name || 'None'}` }
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
                            const priorities = await api.get('/priority');
                            const prioSelect = new Select({
                                name: 'priority',
                                message: 'Select priority',
                                choices: priorities.map(p => ({ name: p.name, message: p.name }))
                            });
                            updateBody.fields.priority = { name: await prioSelect.run() };
                        }
                    }
                }

                if (Object.keys(updateBody.fields).length === 0) {
                    console.log(chalk.yellow('No changes specified.'));
                    return;
                }

                const updateSpinner = ora('Updating issue...').start();
                await api.put(`/issue/${issueKey}`, updateBody);
                updateSpinner.succeed(`${chalk.cyan(issueKey)} updated successfully`);

            } catch (e) {
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
        .action(async (query, options) => {
            const spinner = ora(`Searching for "${query}"...`).start();
            try {
                const jqlParts = [`text ~ "${query.replace(/"/g, '\\"')}"`];
                if (options.project) jqlParts.push(`project = "${options.project}"`);
                const jql = jqlParts.join(' AND ') + ' ORDER BY updated DESC';

                const data = await api.post('/search/jql', {
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
                    console.log(JSON.stringify(data.issues.map(i => ({
                        key: i.key, summary: i.fields.summary,
                        status: i.fields.status?.name, assignee: i.fields.assignee?.displayName || null,
                        updated: i.fields.updated
                    })), null, 2));
                    return;
                }

                const table = new Table({
                    head: [chalk.bold('Key'), chalk.bold('Summary'), chalk.bold('Status'), chalk.bold('Assignee')]
                });
                data.issues.forEach(i => {
                    table.push([
                        chalk.cyan(i.key),
                        i.fields.summary ? (i.fields.summary.length > 55 ? i.fields.summary.substring(0, 52) + '...' : i.fields.summary) : '',
                        i.fields.status?.name || '',
                        i.fields.assignee?.displayName || 'Unassigned'
                    ]);
                });
                console.log(table.toString());
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

                    const { Select } = enquirer;
                    const typeSelect = new Select({
                        name: 'linkType',
                        message: `Link type: ${chalk.cyan(sourceKey)} → ${chalk.cyan(targetKey)}`,
                        choices: linkTypes.issueLinkTypes.map(lt => ({
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

    program.addCommand(issueCmd);
}
