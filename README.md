# Jira Pilot ✈️

[![CI](https://github.com/Aarul5/jira-pilot/actions/workflows/ci.yml/badge.svg)](https://github.com/Aarul5/jira-pilot/actions/workflows/ci.yml)
[![NPM Version](https://img.shields.io/npm/v/jira-pilot.svg)](https://www.npmjs.com/package/jira-pilot)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Snyk Security](https://snyk.io/test/github/Aarul5/jira-pilot/badge.svg)](https://snyk.io/test/github/Aarul5/jira-pilot)
[![MCP Badge](https://lobehub.com/badge/mcp/aarul5-jira-pilot)](https://lobehub.com/mcp/aarul5-jira-pilot)

**The AI-Powered Jira CLI and MCP Server for Humans and Agents.**

`jira-pilot` is a next-generation CLI that combines traditional developer tools with modern AI capabilities.

- **For Humans:** A beautiful, interactive CLI to manage issues, sprints, boards, and code. Now with **AI Code Reviews**, **Epic Planning**, **Daily Standups**, and **Natural Language JQL**.
- **For Agents:** A fully compliant **Model Context Protocol (MCP)** server with **14 tools** that lets AI assistants (like Claude Desktop, Cursor, or Gemini) interact with your Jira instance safely.

---

## Features at a Glance

### 👤 Human-Centric Features
| Feature | Description |
|---------|-------------|
| **Issue Management** | Create, edit, view, list, transition, assign, and comment on issues |
| **Work & Time** | **New:** Log work (`2h 30m`), manage sprints (start/complete), and subtasks |
| **Developer Tools** | **New:** Open PRs, save local filters, git branch integration |
| **Power Tools** | **New:** Bulk assign, bulk label, bulk transition matching JQL |
| **Advanced Data** | **New:** Upload attachments, manage custom fields by alias |
| **AI Copilot** | Summarize, draft descriptions, suggest actions, review code, plan epics, standup reports |
| **Interactive Wizards** | Step-by-step prompts with `enquirer` — no flags required |
| **Rich Visualization** | Dashboard overview, spinners, and formatted output |
| **Export** | Output to JSON or Markdown files, pipeable JSON output |

### 🤖 Agentic Features (MCP)
| Feature | Description |
|---------|-------------|
| **14 MCP Tools** | list_issues, get_issue, create_issue, update_issue, transition_issue, assign_issue, add_comment, add_worklog, create_subtask, add_attachment, search_users, myself, list_projects, list_sprints |
| **LLM-Optimized** | Clean, structured JSON responses for efficient token usage |
| **Stdio Transport** | Standard MCP stdio server — works with any MCP client |

---

## 🚀 Installation

### Prerequisites
- Node.js 20.0.0 or higher

### Global Install (Recommended)
```bash
npm install -g jira-pilot
```

After installing, the `jira` command is available globally.

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

### Profiles & Management
Manage credentials for multiple environments (e.g., Work vs. Personal, Prod vs. Dev).

```bash
jira config view              # Show current configuration (keys are masked)
jira config save work         # Save current creds as profile 'work'
jira config use personal      # Switch to profile 'personal'
jira config profiles          # List all saved profiles
jira config delete-profile work
jira config clear             # Remove all stored credentials
```

### Custom Field Aliases
Define aliases for custom field IDs to make commands easier:
```bash
jira config field set points customfield_10011
jira config field list
```

---

## ✨ Interactive Experience

Jira Pilot is designed to be fully interactive. You don't need to remember complex flags.

**Just run the command, and we'll guide you:**

1.  **Selection**: Use arrow keys `↑` `↓` to navigate lists (Projects, Issue Types, Priorities).
2.  **Filtering**: Start typing to filter long lists (e.g., finding a specific assignee).
3.  **Wizards**: Complex flows like creating an issue are broken down into simple steps.
4.  **Confirmation**: Destructive actions prompt for confirmation (y/N).

Example:
```bash
jira issue create
? Select Project: PROJ - My Project
? Select Issue Type: Bug
? Summary: Login page crashes
? Priority: High
? Assignee: Me
```

---

## 🖥️ Text User Interface (TUI)

Experience Jira in a persistent, interactive terminal interface.

```bash
jira tui
```

**Key Features:**
*   **Dashboard**: Overview of your assigned work.
*   **Issue Navigator**: Browse, filter, and view issues.
*   **Kanban Boards**: Visualize and manage work on Agile boards.
*   **Interactive**: Use arrow keys to navigate rows and columns.

**Navigation Shortcuts:**
*   `←` / `→` : Switch Tabs (Dashboard, Issues, Boards) or Board Columns
*   `↑` / `↓` : Navigate Lists
*   `Enter` : Select / View Details
*   `Esc` / `b` : Back
*   `q` : Quit

---

## 📊 My Dashboard

Start your day with a high-level overview of what's on your plate.

```bash
jira dashboard
```

**What you'll see:**
*   **👋 Welcome Message**: Personalized greeting.
*   **🔥 High Priority**: Issues assigned to you that need immediate attention.
*   **📋 Recent Activity**: Your recently viewed or updated issues.
*   **🚀 Sprint Status**: (If applicable) Active sprint progress.

---

## 📖 Usage Guide

### 📋 Issue Management

#### List Issues
```bash
# List issues assigned to you in active sprints (interactive)
jira issue list

# List with custom JQL
jira issue list --jql "project = PROJ AND priority = High"

# Filter by project, assignee, or status via flags
jira issue list --project PROJ --assignee "john.doe" --status "In Progress"

# Limit results
jira issue list --limit 20

# Natural Language JQL (AI)
jira issue list --ask "high priority bugs assigned to me"

# Export results to file
jira issue list --export json    # Creates issues-TIMESTAMP.json
jira issue list --export md      # Creates issues-TIMESTAMP.md

# Pipeable JSON output (to stdout)
jira issue list --output json | jq .
```

#### Search Issues
Quick text search using JQL `text ~ "query"`:
```bash
jira issue search "login bug"
jira issue search "error 500" --project PROJ
```

#### View Issue Details
```bash
jira issue view PROJ-123
```
Displays: summary, status, priority, assignee, description, components, labels, dates, versions, and recent comments.

#### Create Issue
```bash
# Interactive wizard (recommended)
jira issue create

# Non-interactive with flags for speed
jira issue create -p PROJ -s "Fix login bug"
jira issue create -p PROJ -t Bug -s "Crash on save" --priority High
jira issue create -p PROJ -t Story -s "Add dark mode" -d "Users want a dark theme" -a me

# With Custom Fields (using Alias or ID)
jira issue create -p PROJ -s "Story" --custom "points=5" --custom "customfield_10022=DevOps"
```

#### Edit Issue
```bash
# Interactive Field Picker
jira issue edit PROJ-123

# Quick Edits
jira issue edit PROJ-123 -s "New Summary" --priority High
jira issue edit PROJ-123 -d "New description"
jira issue edit PROJ-123 --custom "points=8"
```

#### Transition Issue Status
```bash
# Interactive — shows available transitions
jira issue transition PROJ-123

# Direct — specify target status
jira issue transition PROJ-123 --status "In Progress"
jira issue transition PROJ-123 -s Done
```

#### Assign / Reassign
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

#### Other Actions
```bash
# Link Issues
jira issue link PROJ-123 PROJ-456 -t Blocks

# Watchers
jira issue watch PROJ-123
jira issue unwatch PROJ-123

# Attachments
jira issue attach PROJ-123 ./logs/server.log
```

---

### ⏱️ Work & Time

#### Worklogs
Track time naturally against issues.
```bash
# Add worklog
jira issue worklog add PROJ-123 2h "Researching API"
jira issue worklog add PROJ-123 30m "Daily standup"
jira issue worklog add PROJ-123 1d "Implementation"

# List worklogs
jira issue worklog list PROJ-123
```

#### Subtasks
```bash
# Interactive subtask creation
jira issue subtask PARENT-123

# Quick subtask
jira issue subtask PARENT-123 -s "Implement backend logic" --assignee me
```

#### Sprint Management
Manage your Agile boards directly.
```bash
# List sprints
jira sprint list --board "My Board"
jira sprint list --board 5 --state active

# List issues in active sprint
jira sprint issues --board 5

# Start/Complete Sprints
jira sprint start 123 --start-date 2023-10-01 --end-date 2023-10-15
jira sprint complete 123
```

---

### 👨‍💻 Developer Workflow

#### Pull Requests
Open a GitHub PR with title and body pre-filled from the Jira issue.
```bash
jira issue pr PROJ-123
# Requires 'gh' CLI to be installed and authenticated
```

#### Git Integration
Create feature branches automatically named from the issue summary.
```bash
jira git branch PROJ-123
# Creates: feature/PROJ-123-issue-summary-slug
```

#### Saved Filters
Save complex JQL queries locally for quick access.
```bash
# Save a filter
jira filter save "My Bugs" "assignee = currentUser() AND issuetype = Bug AND status != Done"

# List saved filters
jira filter list

# Use a saved filter
jira issue list --filter "My Bugs"

# Delete a filter
jira filter delete "My Bugs"
```

---

### ⚡ Power Tools (Bulk Actions)

Perform actions on multiple issues matching a JQL query. Great for cleanups or mass updates.

#### Bulk Transition
Move multiple issues to a new status.
```bash
jira bulk transition -j "project = PROJ AND status = 'To Do'" -s "In Progress"
# Optional: -y to skip confirmation
```

#### Bulk Assign
Assign a set of issues to a user.
```bash
jira bulk assign -j "priority = High AND assignee is EMPTY" --assignee me
```

#### Bulk Label
Add or remove labels from a set of issues.
```bash
jira bulk label -j "fixVersion = 1.0" --add "release-candidate" --remove "wip"
```

---

### 📂 Projects & Boards

#### List Projects
```bash
jira project list
# Displays: project key, name, lead, and style in a formatted table.
```

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

---

### 🤖 AI Features

> **Requires:** AI enabled in `config setup`.

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

#### AI Code Review
Analyze linked PRs/code changes against issue requirements:
```bash
jira ai review PROJ-123
```
*Requires `githubToken` in config.*

#### AI Epic Planning
Break down an Epic into child Stories/Tasks and bulk create them:
```bash
jira ai plan EPIC-123    # Interactive selection of proposed tasks
```

#### AI Standup Report
Generate a daily standup based on your recent activity:
```bash
jira ai standup
```
Outputs: **Yesterday**, **Today**, **Blockers**.

---

## 🧠 Using with AI Agents (MCP)

`jira-pilot` implements the **Model Context Protocol (MCP)**, making it plug-and-play for AI assistants.

### Starting the MCP Server
```bash
jira mcp
```

### Available MCP Tools (14)
Everything you need to build a fully autonomous Jira agent:

1.  `jira_list_issues`: Search via JQL (supports limit)
2.  `jira_get_issue`: Get full details
3.  `jira_create_issue`: Create new issue (ADF support)
4.  `jira_update_issue`: Update summary, desc, priority, assignee
5.  `jira_transition_issue`: Change status
6.  `jira_assign_issue`: Change assignee
7.  `jira_add_comment`: Add comment
8.  `jira_add_worklog`: Log time
9.  `jira_create_subtask`: Create subtask
10. `jira_add_attachment`: Upload file (absolute path)
11. `jira_search_users`: Search for users
12. `jira_myself`: Get current user details
13. `jira_list_projects`: List accessible projects
14. `jira_list_sprints`: List sprints for a board

### Agent Configuration (Claude Desktop)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "jira-pilot", "mcp"]
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

### 📝 Prompts

Pre-defined templates to help LLMs interact with Jira effectively.

| Prompt | Arguments | Description |
|--------|-----------|-------------|
| **jira-assist** | None | System prompt that teaches the LLM how to use Jira Pilot tools best. |
| **jira-summarize-issue** | `issueKey` | Fetches an issue and instructs the LLM to provide a concise summary. |

### 📦 Resources

Direct access to Jira data as context.

| URI | Description |
|-----|-------------|
| **jira://myself** | Details of the currently authenticated user (excluding sensitive PII). |
| **jira://projects** | List of all accessible Jira projects. |

### 🔍 Verification

You can verify the MCP server implementation using the official inspector:

```bash
# If running fro source
npx @modelcontextprotocol/inspector node dist/bin/jira.js mcp

# If installed globally (or via npx)
npx @modelcontextprotocol/inspector npx -y jira-pilot mcp
```

---

## 📦 CLI Command Reference

Run `jira help` or `jira [command] help` to see all options.

```
jira [command]

Commands:
  config           Configure Jira credentials & profiles
  issue            Manage Jira issues
  project          Manage Jira projects
  board            Manage Jira boards
  sprint           Manage Sprints
  bulk             Bulk operations on Jira issues
  dashboard        Show a quick overview of your Jira activity
  git              Git integration for Jira
  ai               AI Helper commands
  mcp              Start MCP Agent Server (Stdio)
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to submit a pull request and set up your development environment.

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## 🛡️ Security

If you discover a security vulnerability within this project, please check [SECURITY.md](SECURITY.md) for our reporting policy.

## 📄 License

ISC
