export interface JiraIssue {
    key: string;
    fields: {
        summary: string;
        description?: any; // ADF
        status: { name: string; id?: string };
        priority?: { name: string; id?: string };
        assignee?: { accountId: string; displayName: string; emailAddress?: string };
        issuetype: { name: string; id?: string; subtask?: boolean };
        created: string;
        updated: string;
        comment?: {
            comments: Array<{
                id: string;
                body: string;
                author: { displayName: string; accountId: string };
                created: string;
            }>;
            total: number;
        };
        [key: string]: any;
    };
}

export interface JiraProject {
    key: string;
    name: string;
    id: string;
    lead?: { displayName: string };
    style?: string; // classic / next-gen
    issueTypes?: Array<{ name: string; subtask?: boolean; id: string }>;
}

export interface JiraSprint {
    id: number;
    name: string;
    state: 'active' | 'future' | 'closed';
    startDate?: string;
    endDate?: string;
    originBoardId?: number;
}

export interface JiraBoard {
    id: number;
    name: string;
    type: string;
    location?: { projectId: number; displayName: string; projectKey: string };
}

export interface ConfigProfile {
    jiraUrl: string;
    email: string;
    apiToken: string;
    aiEnabled?: boolean; // Unified key
    enableAi?: boolean;  // Legacy key support
    aiProvider?: 'openai' | 'gemini' | 'anthropic';
    aiKey?: string; // Legacy
    aiConfig?: {
        apiKey?: string;
        model?: string;
    };
    githubToken?: string;
}

export interface GlobalConfig {
    profiles: Record<string, ConfigProfile>;
    currentProfile?: string;
}
