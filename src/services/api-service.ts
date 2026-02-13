import axios from 'axios';
import chalk from 'chalk';
import { getCredentials } from '../utils/config.js';

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
        this.client = axios.create({
            baseURL: `${this._domain}/rest/api/3`,
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        // Agile REST API v1 client (for boards, sprints, etc.)
        this.agileClient = axios.create({
            baseURL: `${this._domain}/rest/agile/1.0`,
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        // Shared response interceptor
        const errorInterceptor = (error: any) => {
            if (error.response) {
                if (error.response.status === 401) {
                    console.error(chalk.red('Authentication failed. Please check your credentials using "jira config".'));
                } else if (error.response.status === 403) {
                    console.error(chalk.red('Access denied. You may not have permission for this resource.'));
                }
            }
            return Promise.reject(error);
        };

        this.client.interceptors.response.use((r: any) => r, errorInterceptor);
        this.agileClient.interceptors.response.use((r: any) => r, errorInterceptor);
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
        const response = await this.client.get(url, config);
        return response.data;
    }

    async post(url: string, data: any, config: any = {}) {
        this.ensureClient();
        const response = await this.client.post(url, data, config);
        return response.data;
    }

    async put(url: string, data: any, config: any = {}) {
        this.ensureClient();
        const response = await this.client.put(url, data, config);
        return response.data;
    }

    async delete(url: string, config: any = {}) {
        this.ensureClient();
        const response = await this.client.delete(url, config);
        return response.data;
    }

    async search(jql: string, startAt: number = 0, maxResults: number = 50) {
        // CHANGE-2046: Using GET /rest/api/3/search/jql
        return this.get('/search/jql', {
            params: {
                jql,
                maxResults,
                fields: 'summary,status,assignee,priority,issuetype,created,updated,project',
                validation: 'warn'
            }
        });
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
        const response = await this.client.post(url, formData, config);
        return response.data;
    }

    // ── Agile REST API v1 Methods ───────────────────────────────────

    async agileGet(url: string, config: any = {}) {
        this.ensureClient();
        const response = await this.agileClient.get(url, config);
        return response.data;
    }

    async agilePost(url: string, data: any, config: any = {}) {
        this.ensureClient();
        const response = await this.agileClient.post(url, data, config);
        return response.data;
    }
}

export const api = new ApiService();
