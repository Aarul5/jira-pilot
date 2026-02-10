# Jira Pilot ✈️

**The AI-Powered Jira CLI for Humans and Agents.**

`jira-pilot` is a next-generation Command Line Interface for Jira. It bridges the gap between traditional developer tools and modern AI Agents.

- **For Humans:** A beautiful, interactive CLI to manage issues, sprints, boards, and code without leaving your terminal.
- **For Agents:** A fully compliant **Model Context Protocol (MCP)** server with 8 tools that lets AI assistants (like Claude Desktop or Gemini) interact with your Jira instance safely.

---

## Features at a Glance

### 👤 Human-Centric Features
| Feature | Description |
|---------|-------------|
| **Issue Management** | Create, view, list, transition, assign, and comment on issues |
| **Interactive Wizards** | Step-by-step prompts with `enquirer` — no flags required |
| **Board & Sprint Management** | List boards, view sprints by state |
| **Git Integration** | Create feature branches from issues with smart naming |
| **AI Copilot** | Summarize issues, draft descriptions, get next-action suggestions |
| **Rich Visualization** | Beautiful tables, spinners, and formatted output |
| **Export** | Export issues list to JSON or Markdown files |

### 🤖 Agentic Features (MCP)
| Feature | Description |
|---------|-------------|
| **8 MCP Tools** | list_issues, get_issue, create_issue, transition_issue, assign_issue, add_comment, list_projects, list_sprints |
| **LLM-Optimized** | Clean, structured JSON responses for efficient token usage |
| **Stdio Transport** | Standard MCP stdio server — works with any MCP client |

### 🧠 Multi-Provider AI
| Provider | Model |
|----------|-------|
| **OpenAI** | GPT-4o |
| **Google Gemini** | gemini-2.0-flash |
| **Anthropic** | claude-sonnet (claude-sonnet-4-20250514) |

---

## 🚀 Installation

### Global Install (Recommended)
```bash
npm install -g jira-pilot
```

After installing, the `jira` command is available globally.

### Local Development
```bash
git clone https://github.com/Aarul5/jira-pilot.git
cd jira-pilot
npm install
npm link   # Makes 'jira' command available globally
```

---

## ⚙️ Configuration

Before using the tool, set up your credentials. You can get an API Token from [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens).

### Initial Setup
```bash
jira config setup
```

You will be prompted for:
1. **Jira Site URL** — e.g., `https://your-company.atlassian.net`
2. **Email** — Your Atlassian account email
3. **API Token** — The token you generated from Atlassian
4. **Enable AI** — Toggle AI features on/off
5. **AI Provider** — Choose between `openai`, `gemini`, or `anthropic`
6. **AI API Key** — Your API key for the selected provider

### View / Clear Configuration
```bash
jira config view     # Show current configuration (keys are masked)
jira config clear    # Remove all stored credentials
```

> **Note:** Credentials are stored securely using the `conf` library in your system's config directory.

---

## 📖 Usage

### 📋 Issue Management

#### List Issues
```bash
# List issues assigned to you in active sprints
jira issue list

# List with custom JQL
jira issue list --jql "project = PROJ AND priority = High"

# Filter by project, assignee, or status
jira issue list --project PROJ --assignee "john.doe" --status "In Progress"

# Limit results
jira issue list --limit 20

# Export results to file
jira issue list --export json    # Creates issues-TIMESTAMP.json
jira issue list --export md      # Creates issues-TIMESTAMP.md

# Combine filters and export
jira issue list --project PROJ --status Done --export json
```

#### View Issue Details
```bash
jira issue view PROJ-123
```
Displays: summary, status, priority, assignee, description, and recent comments.

#### Create Issue
```bash
# Interactive wizard (recommended)
jira issue create

# Non-interactive with flags
jira issue create -p PROJ -s "Fix login bug"
jira issue create -p PROJ -t Bug -s "Crash on save" --priority High
jira issue create -p PROJ -t Story -s "Add dark mode" -d "Users want a dark theme" -a me
```

**Interactive Wizard Steps:**
1. **Select Project** — Choose from your accessible projects
2. **Select Issue Type** — Bug, Story, Task, Epic, etc.
3. **Enter Summary** — Required issue title
4. **Enter Description** — Optional, converted to Jira ADF format
5. **Select Priority** — High, Medium, Low, etc.
6. **Assign** — Myself, Unassigned, or search by name/email

#### Transition Issue Status
```bash
# Interactive — shows available transitions
jira issue transition PROJ-123

# Direct — specify target status
jira issue transition PROJ-123 --status "In Progress"
jira issue transition PROJ-123 -s Done
```

#### Assign / Reassign Issue
```bash
# Interactive — choose Myself, Unassign, or Search
jira issue assign PROJ-123

# Quick assign
jira issue assign PROJ-123 -a me       # Assign to yourself
jira issue assign PROJ-123 -a none     # Unassign
```

#### Add Comment
```bash
# Interactive — prompts for comment text
jira issue comment PROJ-123

# Inline comment
jira issue comment PROJ-123 -m "Fixed in latest build"
```

---

### 📂 Projects & Boards

#### List Projects
```bash
jira project list
```
Displays: project key, name, lead, and style in a formatted table.

#### List Boards
```bash
# List all boards
jira board list

# Filter by project
jira board list -p PROJ

# Filter by type
jira board list -t scrum
jira board list -t kanban
```

#### List Sprints
```bash
# List active and future sprints
jira sprint list --board 5

# List by board name
jira sprint list --board "My Team Board"

# Filter by state
jira sprint list --board 5 --state active
jira sprint list --board 5 --state closed
```

---

### 🌿 Git Integration

Create feature branches automatically named from the issue summary:
```bash
jira git branch PROJ-123
# Output: Switched to a new branch 'feature/PROJ-123-fix-login-modal'
```

---

### 🤖 AI Features

> **Requires:** AI features must be enabled via `jira config setup` with a valid API key for your chosen provider (OpenAI, Gemini, or Anthropic).

#### Summarize an Issue
Get an AI-generated TL;DR of long issue threads with comments:
```bash
jira ai summarize PROJ-123
```

#### Draft an Issue Description
Generate a structured issue description from rough notes or bullet points:
```bash
# Interactive — prompts for your notes
jira ai draft

# Inline with issue type context
jira ai draft -i "login fails, returns 500, only on mobile" -t bug
jira ai draft -i "add dark mode toggle to settings" -t story
```

#### Suggest Next Actions
Analyze an issue and get AI-powered suggestions for what to do next:
```bash
jira ai suggest PROJ-123
```
Returns: **Immediate Next Action**, **Potential Blockers**, **Suggested Status Transition**, and **Recommendations**.

---

## 🧠 Using with AI Agents (MCP)

`jira-pilot` implements the **Model Context Protocol (MCP)**, making it plug-and-play for AI assistants.

### Starting the MCP Server
```bash
jira mcp
```

### Available MCP Tools

| Tool | Description | Required Args |
|------|-------------|---------------|
| `jira_list_issues` | Search issues via JQL | `jql` |
| `jira_get_issue` | Get full issue details | `issueKey` |
| `jira_create_issue` | Create a new issue (ADF) | `projectKey`, `summary` |
| `jira_transition_issue` | List or execute transitions | `issueKey` |
| `jira_assign_issue` | Assign/unassign an issue | `issueKey` |
| `jira_add_comment` | Add a comment (ADF) | `issueKey`, `body` |
| `jira_list_projects` | List accessible projects | — |
| `jira_list_sprints` | List sprints for a board | `boardId` |

### Claude Desktop Configuration

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/absolute/path/to/jira-pilot/bin/jira.js", "mcp"]
    }
  }
}
```

### VS Code / Cursor Configuration

Add to your `.vscode/mcp.json` or equivalent:

```json
{
  "servers": {
    "jira-pilot": {
      "command": "jira",
      "args": ["mcp"]
    }
  }
}
```

### Example Agent Prompts
Once connected, you can ask your AI assistant things like:
- *"Show me my high-priority Jira issues"*
- *"Create a bug for the login crash on mobile in project PROJ"*
- *"Transition PROJ-123 to In Progress and assign it to me"*
- *"Add a comment to PROJ-456 saying the fix is deployed"*
- *"What sprints are active on board 5?"*

---

## 🧪 Testing & Verification

### Testing the MCP Server
You can test the MCP server functionality using the official [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector node ./bin/jira.js mcp
```

This will launch a web interface where you can:
1. View all 8 available tools and their schemas
2. Execute tools with custom arguments
3. Inspect request/response logs

---

## 📦 CLI Command Reference

```
jira [command]

Commands:
  config           Configure Jira credentials
  issue            Manage Jira issues
  project          Manage Jira projects
  board            Manage Jira boards
  sprint           Manage Sprints
  git              Git integration for Jira
  ai               AI Helper commands
  mcp              Start MCP Agent Server (Stdio)

Issue Subcommands:
  issue list       List issues (JQL, filters, export)
  issue view       View issue details
  issue create     Create a new issue (wizard or flags)
  issue transition Transition issue status
  issue assign     Assign or reassign an issue
  issue comment    Add a comment to an issue

AI Subcommands:
  ai summarize     Summarize an issue using AI
  ai draft         Draft issue description from notes
  ai suggest       Suggest next actions for an issue

Board Subcommands:
  board list       List Jira boards

Sprint Subcommands:
  sprint list      List sprints for a board
```

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

```bash
git clone https://github.com/Aarul5/jira-pilot.git
cd jira-pilot
npm install
npm link
```

## 📄 License

ISC
