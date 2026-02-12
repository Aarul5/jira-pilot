
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../src/services/api-service.js';

// Mock API
vi.mock('../../src/services/api-service.js', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        agileGet: vi.fn()
    }
}));

// Use vi.hoisted to create checking functions that can be accessed inside the mock factory
const mocks = vi.hoisted(() => ({
    setRequestHandler: vi.fn(),
    connect: vi.fn()
}));

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
    Server: class MockServer {
        constructor(info, config) {
            this.info = info;
            this.config = config;
        }
        setRequestHandler(schema, handler) {
            mocks.setRequestHandler(schema, handler);
        }
        connect(transport) {
            return mocks.connect(transport);
        }
    }
}));

describe('MCP Server Integration', () => {
    let toolHandler;

    beforeEach(async () => {
        vi.resetModules(); // IMPORTANT: This forces mcp-server.ts to be re-evaluated
        mocks.setRequestHandler.mockClear();
        mocks.connect.mockClear();

        // Re-import the module to trigger top-level execution
        await import('../../src/server/mcp-server.js');

        // Check calls
        if (mocks.setRequestHandler.mock.calls.length < 2) {
            console.log('Calls:', mocks.setRequestHandler.mock.calls);
            throw new Error(`Expected at least 2 setRequestHandler calls, got ${mocks.setRequestHandler.mock.calls.length}`);
        }

        // The second call is the tool handler (CallToolRequestSchema)
        toolHandler = mocks.setRequestHandler.mock.calls[1][1];
    });

    it('should register handlers', () => {
        expect(toolHandler).toBeDefined();
        expect(typeof toolHandler).toBe('function');
    });

    describe('jira_myself', () => {
        it('should return current user details', async () => {
            api.get.mockResolvedValue({
                accountId: 'acc-123',
                displayName: 'Test User',
                emailAddress: 'test@example.com',
                active: true,
                timeZone: 'UTC'
            });

            const result = await toolHandler({
                params: {
                    name: 'jira_myself',
                    arguments: {}
                }
            });

            expect(api.get).toHaveBeenCalledWith('/myself');
            const content = JSON.parse(result.content[0].text);
            expect(content.accountId).toBe('acc-123');
        });
    });

    describe('jira_search_users', () => {
        it('should return found users', async () => {
            api.get.mockResolvedValue([
                { accountId: '1', displayName: 'Alice', emailAddress: 'alice@test.com', active: true }
            ]);

            const result = await toolHandler({
                params: {
                    name: 'jira_search_users',
                    arguments: { query: 'dev' }
                }
            });

            expect(api.get).toHaveBeenCalledWith('/user/search?query=dev');
            const content = JSON.parse(result.content[0].text);
            expect(content).toHaveLength(1);
        });
    });

    describe('jira_update_issue', () => {
        it('should update specific fields', async () => {
            api.put.mockResolvedValue({});

            const result = await toolHandler({
                params: {
                    name: 'jira_update_issue',
                    arguments: {
                        issueKey: 'TEST-100',
                        summary: 'New Summary',
                        priority: 'High'
                    }
                }
            });

            expect(api.put).toHaveBeenCalledWith('/issue/TEST-100', {
                fields: {
                    summary: 'New Summary',
                    priority: { name: 'High' }
                }
            });

            const content = JSON.parse(result.content[0].text);
            expect(content.success).toBe(true);
        });
    });
});
