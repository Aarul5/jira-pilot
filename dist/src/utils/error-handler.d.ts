import { Ora } from 'ora';
/**
 * Standardized error handler for CLI commands.
 * Stops the spinner and prints a formatted error message.
 *
 * @param {object|null} spinner - Ora spinner instance (will be stopped/failed)
 * @param {Error} error - The error object
 * @param {string} [context] - Optional context (e.g., "Failed to list issues")
 */
export declare function handleCommandError(spinner: Ora | null, error: any, context?: string): void;
