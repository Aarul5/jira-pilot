import { Command } from 'commander';
import chalk from 'chalk';
import { Table } from 'cmd-table';
import { ConfigService } from '../services/config-service.js';
export function registerFilterCommand(program) {
    const filterCmd = new Command('filter')
        .description('Manage saved JQL filters (Local)')
        .addHelpText('after', `
Examples:
  $ jira filter list
  $ jira filter save "My Bugs" "assignee = currentUser() AND issuetype = Bug"
  $ jira filter delete "My Bugs"
        `);
    filterCmd
        .command('list')
        .description('List saved filters')
        .action(async () => {
        const cfg = ConfigService.getConfig();
        const filters = cfg.filters || {};
        if (Object.keys(filters).length === 0) {
            console.log(chalk.yellow('No local filters saved.'));
            return;
        }
        const table = new Table({
            columns: [
                { name: chalk.bold('Name') },
                { name: chalk.bold('JQL') }
            ]
        });
        for (const [name, jql] of Object.entries(filters)) {
            table.addRow([chalk.cyan(name), jql]);
        }
        console.log(table.render());
    });
    filterCmd
        .command('save')
        .description('Save a JQL filter locally')
        .argument('<name>', 'Filter Name')
        .argument('<jql>', 'JQL Query')
        .action(async (name, jql) => {
        try {
            const cfg = ConfigService.getConfig();
            if (!cfg.filters)
                cfg.filters = {};
            cfg.filters[name] = jql;
            ConfigService.saveConfig(cfg);
            console.log(chalk.green(`Filter "${chalk.bold(name)}" saved.`));
        }
        catch (e) {
            console.error(chalk.red(`Failed to save filter: ${e.message}`));
        }
    });
    filterCmd
        .command('delete')
        .description('Delete a saved filter')
        .argument('<name>', 'Filter Name')
        .action(async (name) => {
        try {
            const cfg = ConfigService.getConfig();
            if (!cfg.filters || !cfg.filters[name]) {
                console.log(chalk.yellow(`Filter "${name}" not found.`));
                return;
            }
            delete cfg.filters[name];
            ConfigService.saveConfig(cfg);
            console.log(chalk.green(`Filter "${chalk.bold(name)}" deleted.`));
        }
        catch (e) {
            console.error(chalk.red(`Failed to delete filter: ${e.message}`));
        }
    });
    program.addCommand(filterCmd);
}
//# sourceMappingURL=filter.js.map