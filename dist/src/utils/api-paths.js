export const API = {
    SEARCH: {
        JQL: '/search/jql',
    },
    ISSUE: {
        BASE: '/issue',
        GET: (key) => `/issue/${key}`,
        TRANSITIONS: (key) => `/issue/${key}/transitions`,
        COMMENT: (key) => `/issue/${key}/comment`,
        ASSIGNEE: (key) => `/issue/${key}/assignee`,
        WORKLOG: (key) => `/issue/${key}/worklog`,
        ATTACHMENTS: (key) => `/issue/${key}/attachments`,
        CREATEMETA: (projectKey) => `/issue/createmeta/${projectKey}/issuetypes`,
    },
    PROJECT: {
        SEARCH: '/project/search',
        GET: (key) => `/project/${key}`,
        COMPONENTS: (key) => `/project/${key}/components`,
        VERSIONS: (key) => `/project/${key}/versions`,
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
//# sourceMappingURL=api-paths.js.map