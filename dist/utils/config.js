import ConfigStore from './config-store.js';
const config = new ConfigStore('jira-pilot');
export const getCredentials = () => {
    return {
        jiraUrl: config.get('jiraUrl'),
        email: config.get('email'),
        apiToken: config.get('apiToken'),
        aiKey: config.get('aiKey'),
        aiProvider: config.get('aiProvider'),
        enableAi: config.get('aiEnabled'), // Map legacy key
        githubToken: config.get('githubToken')
    };
};
export const setCredentials = ({ jiraUrl, email, apiToken, aiConfig, aiProvider, enableAi, githubToken }) => {
    if (jiraUrl)
        config.set('jiraUrl', jiraUrl);
    if (email)
        config.set('email', email);
    if (apiToken)
        config.set('apiToken', apiToken);
    if (aiConfig) {
        if (aiConfig.apiKey)
            config.set('aiKey', aiConfig.apiKey);
        config.set('aiConfig', aiConfig);
    }
    if (aiProvider)
        config.set('aiProvider', aiProvider);
    if (typeof enableAi !== 'undefined')
        config.set('enableAi', enableAi);
    if (githubToken)
        config.set('githubToken', githubToken);
};
export const clearCredentials = () => {
    config.clear();
};
export const hasCredentials = () => {
    const creds = getCredentials();
    return !!(creds.jiraUrl && creds.email && creds.apiToken);
};
// ── Profile Management ──────────────────────────────────────────────
export const saveProfile = (name) => {
    const creds = getCredentials();
    config.set(`profiles.${name}`, creds);
    config.set('activeProfile', name);
};
export const loadProfile = (name) => {
    const profile = config.get(`profiles.${name}`);
    if (!profile)
        return false;
    setCredentials(profile);
    config.set('activeProfile', name);
    return true;
};
export const deleteProfile = (name) => {
    config.delete(`profiles.${name}`);
    if (config.get('activeProfile') === name) {
        config.delete('activeProfile');
    }
};
export const listProfiles = () => {
    const profiles = config.get('profiles') || {};
    return Object.keys(profiles);
};
export const getActiveProfile = () => {
    return config.get('activeProfile') || null;
};
//# sourceMappingURL=config.js.map