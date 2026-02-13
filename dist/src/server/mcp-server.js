import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema, ListResourceTemplatesRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { api } from "../services/api-service.js";
import { textToADF } from "../utils/text-to-adf.js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { API } from "../utils/api-paths.js";
// Load package.json for version
const __dirname = dirname(fileURLToPath(import.meta.url));
function getPackageVersion() {
    const candidates = [
        join(__dirname, "../../package.json"),
        join(__dirname, "../../../package.json"),
        join(process.cwd(), "package.json"),
    ];
    for (const p of candidates) {
        if (!existsSync(p))
            continue;
        try {
            const pkg = JSON.parse(readFileSync(p, "utf-8"));
            if (typeof pkg.version === "string" && pkg.version)
                return pkg.version;
        }
        catch { /* ignore */ }
    }
    return "0.0.0";
}
const version = getPackageVersion();
// Initialize MCP Server
const server = new Server({
    name: "jira-pilot",
    version: version,
}, {
    capabilities: {
        tools: {},
        prompts: { listChanged: true },
        resources: { subscribe: false, listChanged: true },
    },
});
// ── Tool Definitions ─────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            // ── Issues ──────────────────────────────────────
            {
                name: "jira_list_issues",
                description: "List Jira issues using JQL. Returns key, summary, status, and assignee for each issue.",
                inputSchema: {
                    type: "object",
                    properties: {
                        jql: { type: "string", description: "JQL query string (e.g., 'project = PROJ AND status = \"In Progress\"')" },
                        limit: { type: "number", description: "Max results (default: 10)", default: 10 }
                    }
                }
            },
            {
                name: "jira_get_issue",
                description: "Get full details of a specific Jira issue including summary, description, status, assignee, priority, and comments.",
                inputSchema: {
                    type: "object",
                    properties: {
                        issueKey: { type: "string", description: "Issue Key (e.g., PROJ-123)" }
                    },
                    required: ["issueKey"]
                }
            },
            {
                name: "jira_create_issue",
                description: "Create a new Jira issue in a project. Returns the created issue key.",
                inputSchema: {
                    type: "object",
                    properties: {
                        projectKey: { type: "string", description: "Project Key (e.g., PROJ)" },
                        summary: { type: "string", description: "Issue summary/title" },
                        description: { type: "string", description: "Issue description (plain text, will be converted to ADF)" },
                        issueType: { type: "string", description: "Issue Type (Bug, Story, Task, Epic)", default: "Task" },
                        priority: { type: "string", description: "Priority name (e.g., High, Medium, Low)" },
                        assigneeId: { type: "string", description: "Assignee account ID" }
                    },
                    required: ["projectKey", "summary"]
                }
            },
            {
                name: "jira_update_issue",
                description: "Update an existing Jira issue. Supports updating summary, description, priority, and assignee.",
                inputSchema: {
                    type: "object",
                    properties: {
                        issueKey: { type: "string", description: "Issue Key (e.g., PROJ-123)" },
                        summary: { type: "string", description: "New summary" },
                        description: { type: "string", description: "New description (plain text)" },
                        priority: { type: "string", description: "New priority name" },
                        assigneeId: { type: "string", description: "New assignee account ID (or 'me', 'none')" }
                    },
                    required: ["issueKey"]
                }
            },
            {
                name: "jira_transition_issue",
                description: "Transition a Jira issue to a new status. First call with only issueKey to see available transitions, then call again with the transitionId.",
                inputSchema: {
                    type: "object",
                    properties: {
                        issueKey: { type: "string", description: "Issue Key (e.g., PROJ-123)" },
                        transitionId: { type: "string", description: "Transition ID to execute. Omit to list available transitions." }
                    },
                    required: ["issueKey"]
                }
            },
            {
                name: "jira_assign_issue",
                description: "Assign or unassign a Jira issue. Use accountId to assign, or null to unassign.",
                inputSchema: {
                    type: "object",
                    properties: {
                        issueKey: { type: "string", description: "Issue Key (e.g., PROJ-123)" },
                        accountId: { type: ["string", "null"], description: "Account ID of the assignee. Set to null to unassign. Use 'me' to assign to yourself." }
                    },
                    required: ["issueKey"]
                }
            },
            {
                name: "jira_add_comment",
                description: "Add a comment to a Jira issue.",
                inputSchema: {
                    type: "object",
                    properties: {
                        issueKey: { type: "string", description: "Issue Key (e.g., PROJ-123)" },
                        body: { type: "string", description: "Comment text (plain text, will be converted to ADF)" }
                    },
                    required: ["issueKey", "body"]
                }
            },
            // ── Users ───────────────────────────────────────
            {
                name: "jira_search_users",
                description: "Search for Jira users by name or email. Returns accountId and displayName.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "Name, email, or part of it" }
                    },
                    required: ["query"]
                }
            },
            {
                name: "jira_myself",
                description: "Get details about the current authenticated user.",
                inputSchema: {
                    type: "object",
                    properties: {}
                }
            },
            // ── Projects & Sprints ──────────────────────────
            {
                name: "jira_list_projects",
                description: "List all accessible Jira projects. Returns project key, name, lead, and style.",
                inputSchema: {
                    type: "object",
                    properties: {
                        limit: { type: "number", description: "Max results (default: 50)", default: 50 }
                    }
                }
            },
            {
                name: "jira_list_sprints",
                description: "List sprints for a Jira board. Requires a board ID.",
                inputSchema: {
                    type: "object",
                    properties: {
                        boardId: { type: "number", description: "Board ID (numeric)" },
                        state: { type: "string", description: "Sprint state filter: active, future, closed (comma-separated)", default: "active,future" }
                    },
                    required: ["boardId"]
                }
            },
            {
                name: "jira_add_worklog",
                description: "Log work to a Jira issue.",
                inputSchema: {
                    type: "object",
                    properties: {
                        issueKey: { type: "string", description: "Issue Key" },
                        timeSpent: { type: "string", description: "Time spent (e.g., '2h 30m', '1d')" },
                        comment: { type: "string", description: "Worklog comment" }
                    },
                    required: ["issueKey", "timeSpent"]
                }
            },
            {
                name: "jira_create_subtask",
                description: "Create a subtask for a parent issue.",
                inputSchema: {
                    type: "object",
                    properties: {
                        parentKey: { type: "string", description: "Parent Issue Key" },
                        summary: { type: "string", description: "Subtask summary" },
                        description: { type: "string", description: "Subtask description" },
                        priority: { type: "string", description: "Priority name" },
                        assigneeId: { type: "string", description: "Assignee Account ID" }
                    },
                    required: ["parentKey", "summary"]
                }
            },
            {
                name: "jira_add_attachment",
                description: "Attach a file to a Jira issue.",
                inputSchema: {
                    type: "object",
                    properties: {
                        issueKey: { type: "string", description: "Issue Key" },
                        filePath: { type: "string", description: "Absolute path to the file to extract/upload" }
                    },
                    required: ["issueKey", "filePath"]
                }
            }
        ]
    };
});
// ── Prompt Definitions ────────────────────────────────────────────────
server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
        prompts: [
            {
                name: "jira-assist",
                description: "A system prompt to help the LLM understand how to assist with Jira tasks.",
            },
            {
                name: "jira-summarize-issue",
                description: "Summarize a specific Jira issue.",
                arguments: [
                    {
                        name: "issueKey",
                        description: "The key of the issue to summarize (e.g., PROJ-123)",
                        required: true
                    }
                ]
            }
        ]
    };
});
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (name === "jira-assist") {
        return {
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: `You are Jira Pilot, an intelligent assistant for Jira.
Your goal is to help users manage their projects, issues, and workflows efficiently.

Available Tools:
- Use 'jira_list_issues' to find issues.
- Use 'jira_get_issue' to see details.
- Use 'jira_create_issue', 'jira_update_issue', 'jira_transition_issue' to modify.

Guidelines:
1. Always be concise and helpful.
2. If the user asks to "fix" something, look for relevant issues first.
3. When creating issues, ask for clarification if fields are missing (Project, Type).
4. Use JQL for powerful searching.`
                    }
                }
            ]
        };
    }
    if (name === "jira-summarize-issue") {
        const issueKey = args?.issueKey;
        if (!issueKey) {
            throw new Error("Missing required argument: issueKey");
        }
        return {
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: `Please fetch details for Jira issue ${issueKey} using 'jira_get_issue', and then provide a concise summary of its status, priority, and recent activity.`
                    }
                }
            ]
        };
    }
    throw new Error(`Prompt not found: ${name}. Available: jira-assist, jira-summarize-issue`);
});
// ── Resource Templates ──────────────────────────────────────────────
server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    return {
        resourceTemplates: []
    };
});
// ── Resource Definitions ──────────────────────────────────────────────
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
        resources: [
            {
                uri: "jira://myself",
                name: "My Profile",
                description: "Details of the currently authenticated user.",
                mimeType: "application/json"
            },
            {
                uri: "jira://projects",
                name: "All Projects",
                description: "List of all accessible Jira projects.",
                mimeType: "application/json"
            }
        ]
    };
});
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const createEnvelope = (type, data) => ({
        source: "jira-pilot",
        type,
        data,
        fetchedAt: new Date().toISOString()
    });
    try {
        if (uri === "jira://myself") {
            const myself = await api.get(API.USER.MYSELF);
            // Mask sensitive data if needed, though 'myself' usually implies permission to see own data.
            // keeping it simple for now, but ensuring consistent shape.
            const safeData = {
                accountId: myself.accountId,
                displayName: myself.displayName,
                active: myself.active,
                timeZone: myself.timeZone,
                // Only include email if present, or maybe mask it? User asked to be careful.
                // We'll exclude email to be safe as per user request "do not include email".
            };
            return {
                contents: [{
                        uri,
                        mimeType: "application/json",
                        text: JSON.stringify(createEnvelope("myself", safeData), null, 2)
                    }]
            };
        }
        if (uri === "jira://projects") {
            const data = await api.get(`${API.PROJECT.SEARCH}?maxResults=50`);
            const projects = (data.values || []).map((p) => ({
                key: p.key,
                name: p.name,
                id: p.id,
                style: p.style
            }));
            return {
                contents: [{
                        uri,
                        mimeType: "application/json",
                        text: JSON.stringify(createEnvelope("projects", projects), null, 2)
                    }]
            };
        }
        throw new Error(`Resource not found: ${uri}. Available: jira://myself, jira://projects`);
    }
    catch (e) {
        // Handle Auth/Network errors specifically
        if (e.response?.status === 401 || e.response?.status === 403) {
            throw new Error(`Jira auth is missing or expired. Run 'jira config setup' to authenticate.`);
        }
        if (e.message.includes("Resource not found")) {
            throw e; // Re-throw 404s we generated
        }
        // Upstream errors
        const status = e.response?.status || "Unknown";
        throw new Error(`Upstream Jira error (${status}): ${e.message}`);
    }
});
// ── Tool Handlers ────────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        // ── jira_list_issues ────────────────────────────────
        if (name === "jira_list_issues") {
            const jql = args.jql || "";
            const limit = args.limit || 10;
            const data = await api.post(API.SEARCH.JQL, {
                jql,
                maxResults: limit,
                fields: ['summary', 'status', 'assignee', 'priority', 'created', 'updated']
            });
            // Return a cleaner format for LLM consumption
            const issues = (data.issues || []).map((i) => ({
                key: i.key,
                summary: i.fields.summary,
                status: i.fields.status?.name,
                assignee: i.fields.assignee?.displayName || 'Unassigned',
                priority: i.fields.priority?.name,
                created: i.fields.created?.split('T')[0],
                updated: i.fields.updated?.split('T')[0]
            }));
            return {
                content: [{ type: "text", text: JSON.stringify(issues, null, 2) }]
            };
        }
        // ── jira_get_issue ──────────────────────────────────
        if (name === "jira_get_issue") {
            const data = await api.get(API.ISSUE.GET(args.issueKey));
            // Return a cleaner summary for agents
            const result = {
                key: data.key,
                summary: data.fields.summary,
                status: data.fields.status?.name,
                issueType: data.fields.issuetype?.name,
                priority: data.fields.priority?.name,
                assignee: data.fields.assignee?.displayName || 'Unassigned',
                assigneeAccountId: data.fields.assignee?.accountId || null,
                reporter: data.fields.reporter?.displayName,
                created: data.fields.created,
                updated: data.fields.updated,
                description: data.fields.description,
                labels: data.fields.labels,
                comments: data.fields.comment?.comments?.map((c) => ({
                    author: c.author.displayName,
                    body: c.body,
                    created: c.created
                })) || []
            };
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
        }
        // ── jira_create_issue ───────────────────────────────
        if (name === "jira_create_issue") {
            const body = {
                fields: {
                    project: { key: args.projectKey },
                    summary: args.summary,
                    issuetype: { name: args.issueType || 'Task' }
                }
            };
            // Convert plain text description to ADF
            if (args.description) {
                body.fields.description = textToADF(args.description);
            }
            if (args.priority) {
                body.fields.priority = { name: args.priority };
            }
            if (args.assigneeId) {
                body.fields.assignee = { accountId: args.assigneeId };
            }
            const data = await api.post(API.ISSUE.BASE, body);
            return {
                content: [{ type: "text", text: JSON.stringify({ key: data.key, self: data.self }, null, 2) }]
            };
        }
        // ── jira_transition_issue ───────────────────────────
        if (name === "jira_transition_issue") {
            if (!args.transitionId) {
                // List available transitions
                const transData = await api.get(API.ISSUE.TRANSITIONS(args.issueKey));
                const issue = await api.get(`${API.ISSUE.GET(args.issueKey)}?fields=summary,status`);
                const result = {
                    issueKey: args.issueKey,
                    summary: issue.fields.summary,
                    currentStatus: issue.fields.status?.name,
                    availableTransitions: (transData.transitions || []).map((t) => ({
                        id: t.id,
                        name: t.name,
                        toStatus: t.to.name
                    }))
                };
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                };
            }
            // Execute transition
            await api.post(API.ISSUE.TRANSITIONS(args.issueKey), {
                transition: { id: args.transitionId }
            });
            return {
                content: [{ type: "text", text: JSON.stringify({ success: true, issueKey: args.issueKey, transitionId: args.transitionId }) }]
            };
        }
        // ── jira_assign_issue ───────────────────────────────
        if (name === "jira_assign_issue") {
            let accountId = args.accountId;
            // Resolve "me" to actual account ID
            if (accountId === 'me') {
                const myself = await api.get(API.USER.MYSELF);
                accountId = myself.accountId;
            }
            await api.put(API.ISSUE.ASSIGNEE(args.issueKey), {
                accountId: accountId || null
            });
            return {
                content: [{ type: "text", text: JSON.stringify({ success: true, issueKey: args.issueKey, assignedTo: accountId || 'unassigned' }) }]
            };
        }
        // ── jira_add_comment ────────────────────────────────
        if (name === "jira_add_comment") {
            const data = await api.post(API.ISSUE.COMMENT(args.issueKey), {
                body: textToADF(args.body)
            });
            return {
                content: [{ type: "text", text: JSON.stringify({ success: true, issueKey: args.issueKey, commentId: data.id }) }]
            };
        }
        // ── jira_update_issue ───────────────────────────────
        if (name === "jira_update_issue") {
            const updateBody = { fields: {} };
            if (args.summary)
                updateBody.fields.summary = args.summary;
            if (args.description)
                updateBody.fields.description = textToADF(args.description);
            if (args.priority)
                updateBody.fields.priority = { name: args.priority };
            if (args.assigneeId) {
                let accId = args.assigneeId;
                if (accId === 'me') {
                    const myself = await api.get(API.USER.MYSELF);
                    accId = myself.accountId;
                }
                else if (accId === 'none') {
                    accId = null;
                }
                updateBody.fields.assignee = { accountId: accId };
            }
            if (Object.keys(updateBody.fields).length === 0) {
                return {
                    content: [{ type: "text", text: "No fields to update provided." }],
                    isError: true
                };
            }
            await api.put(API.ISSUE.GET(args.issueKey), updateBody);
            return {
                content: [{ type: "text", text: JSON.stringify({ success: true, issueKey: args.issueKey }) }]
            };
        }
        // ── jira_search_users ───────────────────────────────
        if (name === "jira_search_users") {
            const users = await api.get(`${API.USER.SEARCH}?query=${encodeURIComponent(args.query)}`);
            const results = (users || []).map((u) => ({
                accountId: u.accountId,
                displayName: u.displayName,
                // Email excluded for safety
                // email: u.emailAddress, 
                active: u.active
            }));
            return {
                content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
            };
        }
        // ── jira_myself ─────────────────────────────────────
        if (name === "jira_myself") {
            const myself = await api.get(API.USER.MYSELF);
            const result = {
                accountId: myself.accountId,
                displayName: myself.displayName,
                // Email excluded for safety
                // email: myself.emailAddress,
                active: myself.active,
                timeZone: myself.timeZone
            };
            return {
                content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
            };
        }
        // ── jira_list_projects ──────────────────────────────
        if (name === "jira_list_projects") {
            const limit = args.limit || 50;
            const data = await api.get(`${API.PROJECT.SEARCH}?maxResults=${limit}`);
            const projects = (data.values || []).map((p) => ({
                key: p.key,
                name: p.name,
                lead: p.lead?.displayName || 'N/A',
                style: p.style,
                projectType: p.projectTypeKey
            }));
            return {
                content: [{ type: "text", text: JSON.stringify(projects, null, 2) }]
            };
        }
        // ── jira_list_sprints ───────────────────────────────
        if (name === "jira_list_sprints") {
            const state = args.state || 'active,future';
            const data = await api.agileGet(`/board/${args.boardId}/sprint?state=${state}`);
            const sprints = (data.values || []).map((s) => ({
                id: s.id,
                name: s.name,
                state: s.state,
                startDate: s.startDate?.split('T')[0] || null,
                endDate: s.endDate?.split('T')[0] || null,
                goal: s.goal || null
            }));
            return {
                content: [{ type: "text", text: JSON.stringify(sprints, null, 2) }]
            };
        }
        // ── jira_add_worklog ────────────────────────────────
        if (name === "jira_add_worklog") {
            const body = {
                timeSpent: args.timeSpent
            };
            if (args.comment) {
                body.comment = textToADF(args.comment);
            }
            await api.post(API.ISSUE.WORKLOG(args.issueKey), body);
            return {
                content: [{ type: "text", text: JSON.stringify({ success: true, issueKey: args.issueKey, timeSpent: args.timeSpent }) }]
            };
        }
        // ── jira_create_subtask ─────────────────────────────
        if (name === "jira_create_subtask") {
            // 1. Fetch parent to get project
            const parent = await api.get(`${API.ISSUE.GET(args.parentKey)}?fields=project`);
            const projectKey = parent.fields.project.key;
            // 2. Find subtask issue type
            const meta = await api.get(`/issue/createmeta/${projectKey}/issuetypes`);
            const allTypes = meta.issueTypes || meta.values || [];
            const subtaskTypes = allTypes.filter((t) => t.subtask);
            if (subtaskTypes.length === 0) {
                return {
                    content: [{ type: "text", text: `Error: No subtask types found in project ${projectKey}` }],
                    isError: true
                };
            }
            const subtaskId = subtaskTypes[0].id; // Default to first available
            const body = {
                fields: {
                    project: { key: projectKey },
                    parent: { key: args.parentKey },
                    issuetype: { id: subtaskId },
                    summary: args.summary
                }
            };
            if (args.description)
                body.fields.description = textToADF(args.description);
            if (args.priority)
                body.fields.priority = { name: args.priority };
            if (args.assigneeId) {
                let accId = args.assigneeId;
                if (accId === 'me') {
                    const myself = await api.get(API.USER.MYSELF);
                    accId = myself.accountId;
                }
                body.fields.assignee = { accountId: accId };
            }
            const data = await api.post(API.ISSUE.BASE, body);
            return {
                content: [{ type: "text", text: JSON.stringify({ key: data.key, self: data.self }, null, 2) }]
            };
        }
        // ── jira_add_attachment ─────────────────────────────
        if (name === "jira_add_attachment") {
            try {
                // Dynamically import fs/path to avoid top-level node dependencies if this runs in browser-like env (unlikely but safe)
                const fs = await import("node:fs");
                const path = await import("node:path");
                const filePath = args.filePath;
                const file = await fs.openAsBlob(filePath);
                const formData = new FormData();
                formData.append("file", file, path.basename(filePath));
                const result = await api.upload(API.ISSUE.ATTACHMENTS(args.issueKey), formData);
                return {
                    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
                };
            }
            catch (e) {
                return {
                    content: [{ type: "text", text: `Error attaching file: ${e.message}` }],
                    isError: true
                };
            }
        }
        throw new Error(`Unknown tool: ${name}`);
    }
    catch (e) {
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
//# sourceMappingURL=mcp-server.js.map