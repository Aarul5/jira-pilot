import Conf from 'conf';

const schema = {
    jiraUrl: {
        type: 'string',
        format: 'url'
    },
    email: {
        type: 'string',
        format: 'email'
    },
    apiToken: {
        type: 'string'
    },
    aiKey: {
        type: 'string'
    },
    aiProvider: {
        type: 'string',
        default: 'openai'
    },
    aiEnabled: {
        type: 'boolean',
        default: false
    }
};

const config = new Conf({
    projectName: 'jira-pilot',
    schema
});

export const getCredentials = () => {
    return {
        jiraUrl: config.get('jiraUrl'),
        email: config.get('email'),
        apiToken: config.get('apiToken'),
        aiKey: config.get('aiKey'),
        aiProvider: config.get('aiProvider'),
        aiEnabled: config.get('aiEnabled')
    };
};

export const setCredentials = ({ jiraUrl, email, apiToken, aiKey, aiProvider, aiEnabled }) => {
    if (jiraUrl) config.set('jiraUrl', jiraUrl);
    if (email) config.set('email', email);
    if (apiToken) config.set('apiToken', apiToken);
    if (aiKey) config.set('aiKey', aiKey);
    if (aiProvider) config.set('aiProvider', aiProvider);
    if (typeof aiEnabled !== 'undefined') config.set('aiEnabled', aiEnabled);
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
    if (!profile) return false;
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
