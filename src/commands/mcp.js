import { Command } from 'commander';
import chalk from 'chalk';
import { startServer } from '../server/mcp-server.js';

export function registerMcpCommand(program) {
    const mcpCmd = new Command('mcp')
        .description('Start MCP Agent Server (Stdio)')
        .action(async () => {
            // MCP server uses stdio, so we shouldn't log anything else to stdout.
            // We can log to stderr if needed.
            try {
                await startServer();
            } catch (e) {
                console.error('MCP Server Error:', e);
                process.exit(1);
            }
        });

    program.addCommand(mcpCmd);
}
