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
export declare class HttpClient {
    private defaults;
    constructor(defaults?: HelperConfig);
    static create(config?: HelperConfig): HttpClient;
    request<T = any>(url: string, options?: RequestInit & RequestConfig): Promise<Response<T>>;
    get<T = any>(url: string, config?: RequestConfig): Promise<Response<T>>;
    post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<Response<T>>;
    put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<Response<T>>;
    delete<T = any>(url: string, config?: RequestConfig): Promise<Response<T>>;
}
export default HttpClient;
