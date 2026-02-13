export declare class ApiService {
    private client;
    private agileClient;
    private _domain;
    constructor();
    init(): void;
    private handleRequest;
    /** @returns {string} The Jira domain URL */
    get domain(): string | null;
    ensureClient(): void;
    get(url: string, config?: any): Promise<any>;
    post(url: string, data: any, config?: any): Promise<any>;
    put(url: string, data: any, config?: any): Promise<any>;
    delete(url: string, config?: any): Promise<any>;
    search(jql: string, startAt?: number, maxResults?: number, nextPageToken?: string): Promise<any>;
    upload(url: string, formData: any): Promise<any>;
    agileGet(url: string, config?: any): Promise<any>;
    agilePost(url: string, data: any, config?: any): Promise<any>;
}
export declare const api: ApiService;
