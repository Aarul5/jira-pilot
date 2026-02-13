
import https from 'https';

interface HelperConfig {
    baseURL?: string;
    headers?: Record<string, string>;
    validateStatus?: (status: number) => boolean;
    httpsAgent?: https.Agent;
}

interface RequestConfig extends HelperConfig {
    params?: Record<string, any>;
}

interface Response<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
}

export class HttpClient {
    private defaults: HelperConfig;

    constructor(defaults: HelperConfig = {}) {
        this.defaults = defaults;
    }

    static create(config: HelperConfig = {}) {
        return new HttpClient(config);
    }

    async request<T = any>(url: string, options: RequestInit & RequestConfig = {}): Promise<Response<T>> {
        const baseURL = options.baseURL || this.defaults.baseURL || '';
        const fullUrl = new URL(url.startsWith('http') ? url : `${baseURL}${url}`);

        if (options.params) {
            Object.entries(options.params).forEach(([key, value]) => {
                if (value !== undefined) fullUrl.searchParams.append(key, String(value));
            });
        }

        const headers = {
            ...this.defaults.headers,
            ...options.headers
        } as Record<string, string>;

        // Handle body for JSON
        let body = options.body;
        if (body && typeof body === 'object') {
            const explicitContentType = headers['Content-Type'];
            if (!explicitContentType || explicitContentType.includes('application/json')) {
                if (!explicitContentType) {
                    headers['Content-Type'] = 'application/json';
                }
                body = JSON.stringify(body);
            }
        }

        const fetchOptions: RequestInit = {
            method: options.method || 'GET',
            headers,
            body: body as BodyInit,
            // Node native fetch doesn't support 'agent' directly in standard RequestInit 
            // but we can pass it via 'dispatcher' in undici, or ignore if using global fetch.
            // For simple usage we usually ignore httpsAgent unless strictly needed.
        };

        const response = await fetch(fullUrl.toString(), fetchOptions);

        let data: any;
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');

        if (response.status === 204 || (contentLength && parseInt(contentLength) === 0)) {
            data = null;
        } else if (contentType && contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (error) {
                // If JSON parsing fails (e.g. empty body despite content-type), fallback to text or null
                const text = await response.text();
                try {
                    data = JSON.parse(text);
                } catch {
                    data = text || null;
                }
            }
        } else {
            data = await response.text();
        }

        const res: Response<T> = {
            data,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        };

        const validateStatus = options.validateStatus || this.defaults.validateStatus || ((s) => s >= 200 && s < 300);
        if (!validateStatus(res.status)) {
            const error: any = new Error(`Request failed with status ${res.status}`);
            error.response = res;
            error.status = res.status;
            throw error;
        }

        return res;
    }

    async get<T = any>(url: string, config: RequestConfig = {}) {
        return this.request<T>(url, { ...config, method: 'GET' });
    }

    async post<T = any>(url: string, data?: any, config: RequestConfig = {}) {
        return this.request<T>(url, { ...config, method: 'POST', body: data });
    }

    async put<T = any>(url: string, data?: any, config: RequestConfig = {}) {
        return this.request<T>(url, { ...config, method: 'PUT', body: data });
    }

    async delete<T = any>(url: string, config: RequestConfig = {}) {
        return this.request<T>(url, { ...config, method: 'DELETE' });
    }
}

export default HttpClient;
