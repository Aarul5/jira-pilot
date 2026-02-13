import { HttpClient } from '../utils/http.js';
import chalk from 'chalk';
import { getCredentials } from '../utils/config.js';
import { API } from '../utils/api-paths.js';

export class ApiService {
    private client: any;
    private agileClient: any;
    private _domain: string | null = null;

    constructor() {
        this.init();
    }



    init() {
        const { jiraUrl, email, apiToken } = getCredentials();

        if (!jiraUrl || !email || !apiToken) {
            this.client = null;
            this._domain = null;
            return;
        }

        const match = jiraUrl.match(/^https?:\/\/(.+?)(\/|$)/);
        this._domain = match ? match[0].replace(/\/$/, '') : jiraUrl;

        const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;

        // Standard REST API v3 client
        this.client = new HttpClient({
            baseURL: `${this._domain}/rest/api/3`,
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            }
        });

        // Agile REST API v1 client (for boards, sprints, etc.)
        this.agileClient = new HttpClient({
            baseURL: `${this._domain}/rest/agile/1.0`,
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            }
        });
    }

    private async handleRequest(request: Promise<any>) {
        try {
            return await request;
        } catch (error: any) {
            if (error.response) {
                if (error.response.status === 401) {
                    console.error(chalk.red('Authentication failed. Please check your credentials using "jira config".'));
                } else if (error.response.status === 403) {
                    console.error(chalk.red('Access denied. You may not have permission for this resource.'));
                }
            }
            throw error;
        }
    }

    /** @returns {string} The Jira domain URL */
    get domain() {
        return this._domain;
    }

    ensureClient() {
        if (!this.client) {
            this.init();
            if (!this.client) {
                throw new Error('Jira credentials not configured. Run "jira config" first.');
            }
        }
    }

    // ── Standard REST API v3 Methods ────────────────────────────────

    async get(url: string, config: any = {}) {
        this.ensureClient();
        const response = await this.handleRequest(this.client.get(url, config));
        return response.data;
    }

    async post(url: string, data: any, config: any = {}) {
        this.ensureClient();
        const response = await this.handleRequest(this.client.post(url, data, config));
        return response.data;
    }

    async put(url: string, data: any, config: any = {}) {
        this.ensureClient();
        const response = await this.handleRequest(this.client.put(url, data, config));
        return response.data;
    }

    async delete(url: string, config: any = {}) {
        this.ensureClient();
        const response = await this.handleRequest(this.client.delete(url, config));
        return response.data;
    }

    async search(jql: string, startAt: number = 0, maxResults: number = 50, nextPageToken?: string) {
        const payload: any = {
            jql,
            maxResults,
            fields: ['summary', 'status', 'assignee', 'priority', 'issuetype', 'created', 'updated', 'project']
        };

        if (nextPageToken) {
            payload.nextPageToken = nextPageToken;
        }

        return this.post(API.SEARCH.JQL, payload);
    }

    async upload(url: string, formData: any) {
        this.ensureClient();
        // Jira requires this header for attachments
        const headers: any = {
            'X-Atlassian-Token': 'no-check'
        };

        // If using 'form-data' package, it has getHeaders().
        // If using native FormData, axios/adapter handles Content-Type + boundary.
        if (formData.getHeaders) {
            Object.assign(headers, formData.getHeaders());
        }

        const config = { headers };
        const response = await this.handleRequest(this.client.post(url, formData, config));
        return response.data;
    }

    // ── Agile REST API v1 Methods ───────────────────────────────────

    async agileGet(url: string, config: any = {}) {
        this.ensureClient();
        const response = await this.handleRequest(this.agileClient.get(url, config));
        return response.data;
    }

    async agilePost(url: string, data: any, config: any = {}) {
        this.ensureClient();
        const response = await this.handleRequest(this.agileClient.post(url, data, config));
        return response.data;
    }
}

export const api = new ApiService();
