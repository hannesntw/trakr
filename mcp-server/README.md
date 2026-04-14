# stori-mcp

MCP server for [Stori](https://stori.zone) — manage agile work items, sprints, and backlogs from Claude Code.

## Quick Start

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "stori": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "stori-mcp"]
    }
  }
}
```

On first run, the MCP server will open your browser to authorize. Sign in to Stori, click **Authorize**, and you're connected.

## Configuration

| Env var | Description | Default |
|---------|-------------|---------|
| `STORI_URL` | Stori server URL | `https://stori.zone` |
| `STORI_API_KEY` | Personal API key (skip device flow) | Auto via device flow |

## Available Tools

- `list_projects`, `create_project` — Project management
- `list_work_items`, `get_work_item`, `create_work_item`, `update_work_item`, `delete_work_item` — Work items (epics, features, stories, bugs, tasks)
- `get_hierarchy` — Full epic > feature > story tree
- `list_sprints`, `create_sprint`, `update_sprint` — Sprint management
- `add_comment`, `list_comments` — Comments
- `list_attachments`, `upload_attachment` — Image attachments
- `get_status_history` — Status change timeline
- `get_work_item_versions`, `restore_work_item_version` — Change history & rollback

## License

MIT
