
export const API = {
    SEARCH: {
        JQL: '/search/jql',
    },
    ISSUE: {
        BASE: '/issue',
        GET: (key: string) => `/issue/${key}`,
        TRANSITIONS: (key: string) => `/issue/${key}/transitions`,
        COMMENT: (key: string) => `/issue/${key}/comment`,
        ASSIGNEE: (key: string) => `/issue/${key}/assignee`,
        WORKLOG: (key: string) => `/issue/${key}/worklog`,
        ATTACHMENTS: (key: string) => `/issue/${key}/attachments`,
        CREATEMETA: (projectKey: string) => `/issue/createmeta/${projectKey}/issuetypes`,
    },
    PROJECT: {
        SEARCH: '/project/search',
        GET: (key: string) => `/project/${key}`,
        COMPONENTS: (key: string) => `/project/${key}/components`,
        VERSIONS: (key: string) => `/project/${key}/versions`,
    },
    USER: {
        MYSELF: '/myself',
        SEARCH: '/user/search',
    },
    PRIORITY: {
        ALL: '/priority',
    },
    SERVER: {
        INFO: '/serverInfo',
    }
};
