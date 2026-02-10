#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load package.json for version
const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

program
    .name('jira')
    .description('AI-powered Jira CLI for humans and agents')
    .version(pkg.version)
    .addHelpText('after', `
Examples:
  $ jira issue list
  $ jira issue view PROJ-123
  $ jira issue create
  $ jira board list
  $ jira sprint list --board 123
  $ jira ai summarize PROJ-123
    `);

import { registerConfigCommand } from '../src/commands/config.js';
import { registerIssueCommand } from '../src/commands/issue.js';
import { registerProjectCommand } from '../src/commands/project.js';
import { registerSprintCommand } from '../src/commands/sprint.js';
import { registerBoardCommand } from '../src/commands/board.js';
import { registerGitCommand } from '../src/commands/git.js';
import { registerAiCommand } from '../src/commands/ai.js';
import { registerMcpCommand } from '../src/commands/mcp.js';

// Register Commands
registerConfigCommand(program);
registerIssueCommand(program);
registerProjectCommand(program);
registerSprintCommand(program);
registerBoardCommand(program);
registerGitCommand(program);
registerAiCommand(program);
registerMcpCommand(program);

program.on('command:*', () => {
    console.error(chalk.red('Invalid command: %s\nSee --help for a list of available commands.'), program.args.join(' '));
    process.exit(1);
});

if (!process.argv.slice(2).length) {
    program.outputHelp();
}

program.parse(process.argv);
