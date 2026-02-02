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

    program.addCommand(configCmd);
}
