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
        aiProvider: config.get('aiProvider')
    };
};

export const setCredentials = ({ jiraUrl, email, apiToken, aiKey, aiProvider }) => {
    if (jiraUrl) config.set('jiraUrl', jiraUrl);
    if (email) config.set('email', email);
    if (apiToken) config.set('apiToken', apiToken);
    if (aiKey) config.set('aiKey', aiKey);
    if (aiProvider) config.set('aiProvider', aiProvider);
};

export const clearCredentials = () => {
    config.clear();
};

export const hasCredentials = () => {
    const creds = getCredentials();
    return !!(creds.jiraUrl && creds.email && creds.apiToken);
};
