import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the module
vi.mock('axios', () => {
    const createMock = () => ({
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
            response: { use: vi.fn() }
        }
    });

    return {
        default: {
            create: vi.fn(() => createMock())
        }
    };
});

vi.mock('../../src/utils/config.js', () => ({
    getCredentials: vi.fn(() => ({
        jiraUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token'
    }))
}));

vi.mock('chalk', () => ({
    default: { red: (s) => s }
}));

describe('ApiService', () => {
    let ApiService, api;

    beforeEach(async () => {
        vi.resetModules();
        const module = await import('../../src/services/api-service.js');
        ApiService = module.ApiService;
        api = module.api;
    });

    it('should export an api instance', () => {
        expect(api).toBeDefined();
        expect(api).toBeInstanceOf(ApiService);
    });

    it('should have standard REST methods', () => {
        expect(typeof api.get).toBe('function');
        expect(typeof api.post).toBe('function');
        expect(typeof api.put).toBe('function');
        expect(typeof api.delete).toBe('function');
    });

    it('should have agile API methods', () => {
        expect(typeof api.agileGet).toBe('function');
        expect(typeof api.agilePost).toBe('function');
    });

    it('should expose domain getter', () => {
        expect(api.domain).toBe('https://test.atlassian.net');
    });

    it('should throw when credentials are missing', async () => {
        vi.resetModules();
        // Re-mock with null credentials for this test
        vi.doMock('../../src/utils/config.js', () => ({
            getCredentials: vi.fn(() => ({
                jiraUrl: null,
                email: null,
                apiToken: null
            }))
        }));

        const { ApiService: FreshApiService } = await import('../../src/services/api-service.js');
        const service = new FreshApiService();
        expect(() => service.ensureClient()).toThrow('credentials');
    });
});
