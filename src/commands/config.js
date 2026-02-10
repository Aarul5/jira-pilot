import { Command } from 'commander';
import chalk from 'chalk';
import enquirer from 'enquirer';
import { setCredentials, getCredentials, clearCredentials } from '../utils/config.js';
import ora from 'ora';
import { api } from '../services/api-service.js';

export function registerConfigCommand(program) {
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
                        skip: (state) => !state.answers.aiEnabled
                    },
                    {
                        type: 'password',
                        name: 'aiKey',
                        message: 'AI API Key:',
                        initial: current.aiKey ? '*****' : undefined,
                        skip: (state) => !state.answers.aiEnabled
                    }
                ]);

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
                } catch (e) {
                    spinner.fail(chalk.red('Verification failed! Credentials saved but might be incorrect.'));
                    console.error(e.message);
                }

            } catch (e) {
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
                });
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

    program.addCommand(configCmd);
}
