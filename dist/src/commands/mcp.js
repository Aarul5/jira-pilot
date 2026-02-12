import { Command } from 'commander';
import chalk from 'chalk';
import { startServer } from '../server/mcp-server.js';
export function registerMcpCommand(program) {
    const mcpCmd = new Command('mcp')
        .description('Start MCP Agent Server (Stdio)')
        .action(async () => {
        // MCP server uses stdio for communication.
        // If run directly in a TTY (terminal), warn the user.
        if (process.stdin.isTTY) {
            console.error(chalk.blue('ℹ Jira MCP Server is running...'));
            console.error(chalk.grey('  This command is designed for AI Agents (Claude, Cursor, etc).'));
            console.error(chalk.grey('  It communicates via JSON-RPC on stdin/stdout.'));
            console.error(chalk.grey('  Press Ctrl+C to stop.'));
        }
        try {
            await startServer();
        }
        catch (e) {
            console.error('MCP Server Error:', e);
            process.exit(1);
        }
    });
    program.addCommand(mcpCmd);
}
//# sourceMappingURL=mcp.js.map