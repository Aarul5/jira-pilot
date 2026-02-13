export declare const API: {
    SEARCH: {
        JQL: string;
    };
    ISSUE: {
        BASE: string;
        GET: (key: string) => string;
        TRANSITIONS: (key: string) => string;
        COMMENT: (key: string) => string;
        ASSIGNEE: (key: string) => string;
        WORKLOG: (key: string) => string;
        ATTACHMENTS: (key: string) => string;
        CREATEMETA: (projectKey: string) => string;
    };
    PROJECT: {
        SEARCH: string;
        GET: (key: string) => string;
        COMPONENTS: (key: string) => string;
        VERSIONS: (key: string) => string;
    };
    USER: {
        MYSELF: string;
        SEARCH: string;
    };
    PRIORITY: {
        ALL: string;
    };
    SERVER: {
        INFO: string;
    };
};
