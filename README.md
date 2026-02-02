# Jira Pilot ✈️

**The AI-Powered Jira CLI for Humans and Agents.**

`jira-pilot` is a next-generation Command Line Interface for Jira. It bridges the gap between traditional developer tools and modern AI Agents.

- **For Humans:** A beautiful, interactive CLI to manage issues, sprints, and code without leaving your terminal.
- **For Agents:** A fully compliant **Model Context Protocol (MCP)** server that lets AI assistants (like Claude Desktop (Claude Desktop) or Gemini) interact with your Jira instance safely.

## ✨ Features

### 👤 Human-Centric Features
- **Interactive Wizards**: Create and transition issues with `enquirer` prompts. No more remembering complex flags.
- **Git Integration**: Create feature branches directly from issues with smart naming.
  - `jira git branch PROJ-123` -> `feature/PROJ-123-fix-login-bug`
- **Rich Visualization**: Beautiful tables and formatted output.
- **AI Copilot**:
  - `jira ai summarize PROJ-123`: Get a TL;DR of long issue threads.
  - `jira ai draft`: Draft descriptions from bullet points (Coming Soon).

### 🤖 Agentic Features (MCP)
- **Agent Skill**: Run `jira mcp` to start a stdio server.
- **Standardized Tools**: Exposes `list_issues`, `get_issue`, `create_issue` to any MCP client.
- **Low-Context Mode**: Optimized JSON outputs for LLM consumption.

---

## 🚀 Installation

### Global Install (Recommended)
```bash
npm install -g jira-pilot
```

### Local Development
```bash
git clone https://github.com/yourusername/jira-pilot.git
cd jira-pilot
npm install
npm link
```

---

## ⚙️ Configuration

Before using the tool, set up your credentials. You can get an API Token from [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens).

```bash
jira config setup
```

You will be prompted for:
1.  **Jira Site URL**: e.g., `https://your-company.atlassian.net`
2.  **Email**: Your Atlassian account email.
3.  **API Token**: The token you generated.
4.  **AI API Key (Optional)**: Your OpenAI API Key (for `jira ai` commands).

To view current config:
```bash
jira config view
```

---

## 📖 Usage

### Issues
```bash
# List issues (default: assigned to you, active sprints)
jira issue list

# List with custom JQL
jira issue list --jql "project = PROJ AND priority = High"

# Create a new issue (interactive)
jira issue create

# View details
jira issue view PROJ-123

# Transition status (interactive)
jira issue transition PROJ-123

# Export issues to file
jira issue list --export json  # Creates issues-TIMESTAMP.json
jira issue list --export md    # Creates issues-TIMESTAMP.md
```

### Projects & Sprints
```bash
# List projects
jira project list

# List sprints for a board
jira sprint list --board 5
```

### Git Integration
Create a branch automatically named from the issue summary:
```bash
jira git branch PROJ-123
# Output: Switched to a new branch 'feature/PROJ-123-fix-login-modal'
```

### AI Features
Summarize a complex issue thread:
```bash
jira ai summarize PROJ-123
```
*(Requires OpenAI Key in config)*

---

## 🧠 Using with AI Agents (Claude/Gemini)

`jira-pilot` implements the **Model Context Protocol (MCP)**, making it plug-and-play for AI assistants.

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

Once connected, you can ask Claude things like:
> "Check my assigned Jira issues and create a feature branch for the highest priority one."

---

## 🛠️ Project Structure
- `bin/`: Entry point.
- `src/commands/`: CLI command definitions (Human UI).
- `src/server/`: MCP Server implementation (Agent UI).
- `src/services/`: Core logic (API, AI).

## 📄 License
ISC
