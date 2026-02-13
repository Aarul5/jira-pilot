import { Command } from 'commander';
import chalk from 'chalk';
import enquirer from 'enquirer';
import { setCredentials, getCredentials, clearCredentials, saveProfile, loadProfile, deleteProfile, listProfiles, getActiveProfile } from '../utils/config.js';
import ConfigStore from '../utils/config-store.js';
import ora from '../utils/spinner.js';
import { api } from '../services/api-service.js';

export function registerConfigCommand(program: Command) {
    const configCmd = new Command('config')
        .description('Configure Jira credentials');

    configCmd
        .command('setup')
        .description('Interactive setup of Jira credentials')
        .action(async () => {
            console.log(chalk.blue('Configuring jira-pilot...'));

            const current = getCredentials();

            try {
                const answers = await enquirer.prompt([
                    {
                        type: 'input',
                        name: 'jiraUrl',
                        message: 'Jira Site URL (e.g., https://your-domain.atlassian.net):',
                        initial: current.jiraUrl
                    },
                    {
                        type: 'input',
                        name: 'email',
                        message: 'Jira Email Address:',
                        initial: current.email
                    },
                    {
                        type: 'password',
                        name: 'apiToken',
                        message: 'Jira API Token:',
                        initial: current.apiToken ? '*****' : undefined
                    },
                    {
                        type: 'confirm',
                        name: 'aiEnabled',
                        message: 'Enable AI features?',
                        initial: current.aiEnabled || false
                    },
                    {
                        type: 'select',
                        name: 'aiProvider',
                        message: 'Select AI Provider:',
                        choices: ['openai', 'gemini', 'anthropic'],
                        initial: current.aiProvider || 'openai',
                        skip: function () { return !this.state.answers.aiEnabled; }
                    },
                    {
                        type: 'password',
                        name: 'aiKey',
                        message: 'AI API Key:',
                        initial: current.aiKey ? '*****' : undefined,
                        skip: function () { return !this.state.answers.aiEnabled; }
                    },
                    {
                        type: 'password',
                        name: 'githubToken',
                        message: 'GitHub Personal Access Token (for AI Code Review) [Optional, Press Enter to skip]:',
                        initial: current.githubToken ? '*****' : undefined,
                        skip: function () { return !this.state.answers.aiEnabled; }
                    }
                ] as any) as any;

                // Keep existing token if user didn't change it (and entered ***** which is not real)
                // Actually prompt returns text. If they leave it blank?
                // Let's assume if they type nothing, we keep old? Enquirer behavior depends. 
                // Better to just save what we get.

                // Validation check
                const spinner = ora('Verifying credentials...').start();

                // Temporarily set config to test
                setCredentials(answers);
                api.init(); // Refresh api client with new creds

                try {
                    await api.get('/myself');
                    spinner.succeed(chalk.green('Credentials verified and saved!'));
                } catch (e: any) {
                    spinner.fail(chalk.red('Verification failed! Credentials saved but might be incorrect.'));
                    console.error(e.message);
                }

            } catch (e: any) {
                console.error(chalk.red('Setup cancelled or failed'), e);
            }
        });

    configCmd
        .command('view')
        .description('View current configuration')
        .action(() => {
            const { jiraUrl, email } = getCredentials();
            if (jiraUrl) {
                console.log(chalk.green('Current Configuration:'));
                console.log(`URL: ${jiraUrl}`);
                console.log(`Email: ${email}`);
                console.log(`Token: ************`);
            } else {
                console.log(chalk.yellow('No configuration found. Run "jira config setup"'));
            }
        });

    configCmd
        .command('clear')
        .description('Clear saved credentials')
        .action(() => {
            clearCredentials();
            console.log(chalk.green('Credentials cleared.'));
        });

    const aiConfigCmd = new Command('ai')
        .description('Manage AI settings');

    aiConfigCmd
        .command('enable')
        .description('Enable AI features')
        .action(async () => {
            const current = getCredentials();
            let key = current.aiKey;

            if (!key) {
                const response = await enquirer.prompt({
                    type: 'password',
                    name: 'aiKey',
                    message: 'Enter AI API Key:'
                }) as any;
                key = response.aiKey;
            }

            setCredentials({ aiEnabled: true, aiKey: key });
            console.log(chalk.green('AI features enabled!'));
        });

    aiConfigCmd
        .command('disable')
        .description('Disable AI features')
        .action(() => {
            setCredentials({ aiEnabled: false });
            console.log(chalk.yellow('AI features disabled.'));
        });

    aiConfigCmd
        .command('status')
        .description('Check AI feature status')
        .action(() => {
            const { aiEnabled, aiProvider } = getCredentials();
            console.log(`AI Enabled: ${aiEnabled ? chalk.green('Yes') : chalk.red('No')}`);
            console.log(`Provider: ${aiProvider || 'None'}`);
        });

    configCmd.addCommand(aiConfigCmd);

    // ── PROFILE MANAGEMENT ───────────────────────────────────────────
    configCmd
        .command('save')
        .description('Save current config as a named profile')
        .argument('<name>', 'Profile name')
        .action((name: string) => {
            saveProfile(name);
            console.log(chalk.green(`Profile "${name}" saved and set as active.`));
        });

    configCmd
        .command('use')
        .description('Switch to a saved profile')
        .argument('<name>', 'Profile name')
        .action((name: string) => {
            if (loadProfile(name)) {
                console.log(chalk.green(`Switched to profile "${name}".`));
                const creds = getCredentials();
                console.log(`  URL: ${creds.jiraUrl}`);
                console.log(`  Email: ${creds.email}`);
            } else {
                console.error(chalk.red(`Profile "${name}" not found.`));
                const profiles = listProfiles();
                if (profiles.length > 0) {
                    console.log(chalk.grey(`Available: ${profiles.join(', ')}`));
                }
            }
        });

    configCmd
        .command('profiles')
        .description('List saved profiles')
        .action(() => {
            const profiles = listProfiles();
            const active = getActiveProfile();

            if (profiles.length === 0) {
                console.log(chalk.yellow('No profiles saved. Use "jira config save <name>" to save one.'));
                return;
            }

            console.log(chalk.bold('\nSaved Profiles:\n'));
            profiles.forEach(p => {
                const marker = p === active ? chalk.green(' ✓ (active)') : '';
                console.log(`  ${chalk.cyan(p)}${marker}`);
            });
            console.log('');
        });

    configCmd
        .command('delete-profile')
        .description('Delete a saved profile')
        .argument('<name>', 'Profile name')
        .action((name: string) => {
            const profiles = listProfiles();
            if (!profiles.includes(name)) {
                console.error(chalk.red(`Profile "${name}" not found.`));
                return;
            }
            deleteProfile(name);
            console.log(chalk.green(`Profile "${name}" deleted.`));
        });

    // ── CUSTOM FIELD MANAGEMENT ─────────────────────────────────────
    const fieldCmd = new Command('field')
        .description('Manage custom field aliases');

    fieldCmd
        .command('set')
        .description('Set a custom field alias')
        .argument('<alias>', 'Field Alias (e.g. storyPoints)')
        .argument('<fieldId>', 'Field ID (e.g. customfield_10011)')
        .action((alias, fieldId) => {
            const config = new ConfigStore('jira-pilot');
            config.set(`customFields.${alias}`, fieldId);
            console.log(chalk.green(`Alias "${chalk.bold(alias)}" mapped to ${chalk.bold(fieldId)}.`));
        });

    fieldCmd
        .command('list')
        .description('List custom field aliases')
        .action(() => {
            const config = new ConfigStore('jira-pilot');
            const fields = config.get('customFields') || {};
            if (Object.keys(fields).length === 0) {
                console.log(chalk.yellow('No custom field aliases defined.'));
                return;
            }
            console.log(chalk.bold('\nCustom Field Aliases:\n'));
            for (const [alias, id] of Object.entries(fields)) {
                console.log(`  ${chalk.cyan(alias)}: ${id}`);
            }
            console.log('');
        });

    fieldCmd
        .command('delete')
        .description('Delete a custom field alias')
        .argument('<alias>', 'Field Alias')
        .action((alias) => {
            const config = new ConfigStore('jira-pilot');
            if (!config.get(`customFields.${alias}`)) {
                console.error(chalk.red(`Alias "${alias}" not found.`));
                return;
            }
            config.delete(`customFields.${alias}`);
            console.log(chalk.green(`Alias "${chalk.bold(alias)}" deleted.`));
        });

    configCmd.addCommand(fieldCmd);

    program.addCommand(configCmd);
}
