import axios from 'axios';
import chalk from 'chalk';
import { getCredentials } from '../utils/config.js';

export class ApiService {
    constructor() {
        this.init();
    }

    init() {
        const { jiraUrl, email, apiToken } = getCredentials();

        if (!jiraUrl || !email || !apiToken) {
            // Don't throw here, allow initialization for 'config' command usage
            this.client = null;
            return;
        }

        const match = jiraUrl.match(/^https?:\/\/(.+?)(\/|$)/);
        const domain = match ? match[0] : jiraUrl;

        this.client = axios.create({
            baseURL: `${domain.replace(/\/$/, '')}/rest/api/3`,
            headers: {
                'Authorization': `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        // Response interceptor for error handling
        this.client.interceptors.response.use(
            response => response,
            error => {
                if (error.response) {
                    if (error.response.status === 401) {
                        console.error(chalk.red('Authentication failed. Please check your credentials using "jira config".'));
                    } else if (error.response.status === 403) {
                        console.error(chalk.red('Access denied. You may not have permission for this resource.'));
                    } else if (error.response.status === 404) {
                        // Sometime 404 is valid (issues not found), let caller handle? 
                        // Or log generic error? For now rethrow with clean message property if possible.
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    ensureClient() {
        if (!this.client) {
            // Try to re-init in case config was just set
            this.init();
            if (!this.client) {
                throw new Error('Jira credentials not configured. Run "jira config" first.');
            }
        }
    }

    async get(url, config = {}) {
        this.ensureClient();
        try {
            const response = await this.client.get(url, config);
            return response.data;
        } catch (e) {
            // Optional: Wrap error
            throw e;
        }
    }

    async post(url, data, config = {}) {
        this.ensureClient();
        try {
            const response = await this.client.post(url, data, config);
            return response.data;
        } catch (e) {
            throw e;
        }
    }

    async put(url, data, config = {}) {
        this.ensureClient();
        const response = await this.client.put(url, data, config);
        return response.data;
    }

    async delete(url, config = {}) {
        this.ensureClient();
        const response = await this.client.delete(url, config);
        return response.data;
    }
}

export const api = new ApiService();
