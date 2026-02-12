
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
    describe('jira_add_worklog', () => {
        it('should add worklog', async () => {
            api.post.mockResolvedValue({});

            const result = await toolHandler({
                params: {
                    name: 'jira_add_worklog',
                    arguments: {
                        issueKey: 'TEST-100',
                        timeSpent: '2h',
                        comment: 'Working hard'
                    }
                }
            });

            expect(api.post).toHaveBeenCalledWith('/issue/TEST-100/worklog', {
                timeSpent: '2h',
                comment: expect.objectContaining({ type: 'doc' }) // textToADF output
            });

            const content = JSON.parse(result.content[0].text);
            expect(content.success).toBe(true);
        });
    });

    describe('jira_create_subtask', () => {
        it('should create subtask with auto-detected type', async () => {
            // Mock sequence:
            // 1. Get parent project
            api.get.mockResolvedValueOnce({ fields: { project: { key: 'PROJ' } } });
            // 2. Get subtask types
            api.get.mockResolvedValueOnce({
                issueTypes: [{ id: '99', name: 'Sub-task', subtask: true }]
            });
            // 3. Create issue
            api.post.mockResolvedValueOnce({ key: 'PROJ-101', self: 'http://...' });

            const result = await toolHandler({
                params: {
                    name: 'jira_create_subtask',
                    arguments: {
                        parentKey: 'PROJ-100',
                        summary: 'Subtask 1',
                        priority: 'High'
                    }
                }
            });

            // Verify calls
            expect(api.get).toHaveBeenCalledWith('/issue/PROJ-100?fields=project');
            expect(api.get).toHaveBeenCalledWith('/issue/createmeta/PROJ/issuetypes');
            expect(api.post).toHaveBeenCalledWith('/issue', {
                fields: {
                    project: { key: 'PROJ' },
                    parent: { key: 'PROJ-100' },
                    issuetype: { id: '99' },
                    summary: 'Subtask 1',
                    priority: { name: 'High' }
                }
            });

            const content = JSON.parse(result.content[0].text);
            expect(content.key).toBe('PROJ-101');
        });
    });
});
