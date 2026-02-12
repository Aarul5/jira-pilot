/**
 * Input Validators for CLI commands.
 * Validates user input before API calls to catch errors early.
 */
/**
 * Validates a Jira issue key format (e.g., PROJ-123).
 * @param {string} key - The issue key to validate.
 * @returns {{ valid: boolean, message?: string }}
 */
export declare function validateIssueKey(key: any): {
    valid: boolean;
    message?: string;
};
/**
 * Validates a Jira project key (e.g., PROJ).
 * @param {string} key - The project key to validate.
 * @returns {{ valid: boolean, message?: string }}
 */
export declare function validateProjectKey(key: any): {
    valid: boolean;
    message?: string;
};
/**
 * Validates a Jira site URL.
 * @param {string} url - The URL to validate.
 * @returns {{ valid: boolean, message?: string }}
 */
export declare function validateUrl(url: any): {
    valid: boolean;
    message?: string;
};
/**
 * Sanitizes a JQL string by escaping potentially dangerous characters.
 * This is a basic sanitization — Jira's API does its own validation too.
 * @param {string} jql - The JQL query string.
 * @returns {string} The sanitized JQL string.
 */
export declare function sanitizeJql(jql: any): string;
