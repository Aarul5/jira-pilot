import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { api } from "../services/api-service.js";

// Initialize MCP Server
const server = new Server(
    {
        name: "jira-pilot",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Define Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "jira_list_issues",
                description: "List Jira issues using JQL",
                inputSchema: {
                    type: "object",
                    properties: {
                        jql: { type: "string", description: "JQL query string" },
                        limit: { type: "number", description: "Max results", default: 10 }
                    }
                }
            },
            {
                name: "jira_get_issue",
                description: "Get details of a specific Jira issue",
                inputSchema: {
                    type: "object",
                    properties: {
                        issueKey: { type: "string", description: "Issue Key (e.g. PROJ-123)" }
                    },
                    required: ["issueKey"]
                }
            },
            {
                name: "jira_create_issue",
                description: "Create a new Jira issue",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectKey: { type: "string", description: "Project Key" },
                        summary: { type: "string", description: "Issue Summary" },
                        description: { type: "string", description: "Issue Description" },
                        issueType: { type: "string", description: "Issue Type (Bug, Story, etc)", default: "Task" }
                    },
                    required: ["projectKey", "summary"]
                }
            }
        ]
    };
});

// Handle Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === "jira_list_issues") {
            const jql = args.jql || "";
            const limit = args.limit || 10;
            const data = await api.post('/search/jql', {
                jql,
                maxResults: limit,
                fields: ['summary', 'status', 'assignee', 'description']
            });

            return {
                content: [{ type: "text", text: JSON.stringify(data.issues, null, 2) }]
            };
        }

        if (name === "jira_get_issue") {
            const data = await api.get(`/issue/${args.issueKey}`);
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
        }

        if (name === "jira_create_issue") {
            const body = {
                fields: {
                    project: { key: args.projectKey },
                    summary: args.summary,
                    description: args.description,
                    issuetype: { name: args.issueType || 'Task' }
                }
            };
            const data = await api.post('/issue', body);
            return {
                content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
            };
        }

        throw new Error(`Unknown tool: ${name}`);

    } catch (e) {
        const errorMessage = e.response?.data ? JSON.stringify(e.response.data) : e.message;
        return {
            content: [{ type: "text", text: `Error: ${errorMessage}` }],
            isError: true
        };
    }
});

// Start Server
export async function startServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
