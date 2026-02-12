import chalk from 'chalk';
/**
 * Standardized error handler for CLI commands.
 * Stops the spinner and prints a formatted error message.
 *
 * @param {object|null} spinner - Ora spinner instance (will be stopped/failed)
 * @param {Error} error - The error object
 * @param {string} [context] - Optional context (e.g., "Failed to list issues")
 */
export function handleCommandError(spinner, error, context = 'Operation failed') {
    // Handle user cancellation (Ctrl+C in enquirer)
    if (error === '' || (error && error.message === '')) {
        if (spinner)
            spinner.stop();
        console.log(chalk.yellow('\nCancelled.'));
        return;
    }
    if (spinner) {
        spinner.fail(context);
    }
    else {
        console.error(chalk.red(`\n${context}:`));
    }
    if (error.response) {
        const status = error.response.status;
        if (status === 404) {
            console.error(chalk.red('Resource not found. Check the ID or key.'));
        }
        else if (status === 400) {
            const data = error.response.data;
            const messages = data?.errorMessages?.join(', ') || (data?.errors
                ? Object.entries(data.errors).map(([k, v]) => `${k}: ${v}`).join(', ')
                : JSON.stringify(data));
            console.error(chalk.red(`Bad Request: ${messages}`));
        }
        else {
            console.error(chalk.red(`Error ${status}: `), error.response.data);
        }
    }
    else {
        console.error(chalk.red(error.message));
    }
}
//# sourceMappingURL=error-handler.js.map