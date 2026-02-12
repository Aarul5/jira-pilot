/**
 * Input Validators for CLI commands.
 * Validates user input before API calls to catch errors early.
 */
/**
 * Validates a Jira issue key format (e.g., PROJ-123).
 * @param {string} key - The issue key to validate.
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateIssueKey(key) {
    if (!key || typeof key !== 'string') {
        return { valid: false, message: 'Issue key is required.' };
    }
    const trimmed = key.trim().toUpperCase();
    const pattern = /^[A-Z][A-Z0-9_]+-\d+$/;
    if (!pattern.test(trimmed)) {
        return {
            valid: false,
            message: `Invalid issue key "${key}". Expected format: PROJ-123 (letters/numbers, dash, digits).`
        };
    }
    return { valid: true };
}
/**
 * Validates a Jira project key (e.g., PROJ).
 * @param {string} key - The project key to validate.
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateProjectKey(key) {
    if (!key || typeof key !== 'string') {
        return { valid: false, message: 'Project key is required.' };
    }
    const trimmed = key.trim().toUpperCase();
    const pattern = /^[A-Z][A-Z0-9_]+$/;
    if (!pattern.test(trimmed)) {
        return {
            valid: false,
            message: `Invalid project key "${key}". Must start with a letter and contain only uppercase letters, digits, or underscores.`
        };
    }
    return { valid: true };
}
/**
 * Validates a Jira site URL.
 * @param {string} url - The URL to validate.
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateUrl(url) {
    if (!url || typeof url !== 'string') {
        return { valid: false, message: 'URL is required.' };
    }
    const trimmed = url.trim();
    try {
        const parsed = new URL(trimmed);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return { valid: false, message: 'URL must use http or https protocol.' };
        }
        return { valid: true };
    }
    catch {
        return { valid: false, message: `Invalid URL: "${url}". Example: https://your-company.atlassian.net` };
    }
}
/**
 * Sanitizes a JQL string by escaping potentially dangerous characters.
 * This is a basic sanitization — Jira's API does its own validation too.
 * @param {string} jql - The JQL query string.
 * @returns {string} The sanitized JQL string.
 */
export function sanitizeJql(jql) {
    if (!jql || typeof jql !== 'string') {
        return '';
    }
    // Remove null bytes and control characters
    return jql.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}
//# sourceMappingURL=validators.js.map