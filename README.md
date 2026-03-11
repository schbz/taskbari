# TaskBari

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/SkySloane.taskbari?label=Marketplace&color=blue)](https://marketplace.visualstudio.com/items?itemName=SkySloane.taskbari)

VS Code extension that loads workspace tasks into the status bar — with **category grouping** support.

Inspired by earlier task-button status bar extensions, TaskBari goes further by letting you collapse related tasks into group buttons. Clicking a group opens a QuickPick menu listing all tasks in that category, saving valuable status bar space.

## Features

- **Individual task buttons** on the status bar like other extensions which inspired this one
- **Group buttons** that collapse multiple related tasks into a single status bar button
- **QuickPick submenus** that appear when you click a group button
- Configurable group labels, icons, colors, and sort priority
- Full backward compatibility with existing `tasks.json` configurations

## Install

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=SkySloane.taskbari), or in VS Code/Cursor press `Ctrl+P` and run:

```
ext install SkySloane.taskbari
```

## Quick Start

Add tasks to your `.vscode/tasks.json` as usual. To group tasks, add a `group` property inside `options.statusbar`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build Debug",
      "type": "shell",
      "command": "make debug",
      "options": {
        "statusbar": {
          "group": "Build"
        }
      }
    },
    {
      "label": "Build Release",
      "type": "shell",
      "command": "make release",
      "options": {
        "statusbar": {
          "group": "Build"
        }
      }
    },
    {
      "label": "Lint",
      "type": "shell",
      "command": "npm run lint"
    }
  ]
}
```

This creates **two** status bar items instead of three: a "Build (2)" group button and a "Lint" individual button. Clicking "Build (2)" opens a QuickPick with "Build Debug" and "Build Release".

## Group Configuration

For more control, use an object instead of a string:

```json
{
  "label": "Build Debug",
  "type": "shell",
  "command": "make debug",
  "options": {
    "statusbar": {
      "group": {
        "id": "Build",
        "label": "Build",
        "icon": "tools",
        "color": "#22C1D6",
        "priority": 10
      }
    }
  }
}
```

| Property   | Type   | Description |
|------------|--------|-------------|
| `id`       | string | **Required.** Group identifier — tasks with the same id are grouped together. |
| `label`    | string | Display label for the group button. Defaults to the `id`. |
| `icon`     | string | Codicon ID (e.g. `tools`, `beaker`, `cloud-upload`). Rendered as `$(icon)` prefix. |
| `color`    | string | Foreground color — hex value or theme color name. |
| `priority` | number | Sort order for groups. Higher values appear first. Default: `0`. |

Only the **first task** in a group that specifies these properties "wins" — subsequent tasks in the same group only need `"group": "Build"`.

## Per-Task Options

All standard status bar options are supported:

```json
"options": {
  "statusbar": {
    "label": "$(beaker) Test",
    "color": "#22C1D6",
    "detail": "Run unit tests",
    "hide": false,
    "filePattern": "test_.*"
  }
}
```

## Extension Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `tasks.statusbar.default.hide` | boolean | `false` | Hide all tasks by default |
| `tasks.statusbar.default.color` | string | `""` | Default foreground color |
| `tasks.statusbar.limit` | integer \| null | `null` | Max visible status bar buttons (overflow goes to "..." picker) |
| `tasks.statusbar.select.label` | string | `"..."` | Label for the overflow picker button |
| `tasks.statusbar.select.color` | string | `""` | Color for the overflow picker button |
| `tasks.statusbar.groups.showTaskCount` | boolean | `true` | Show `(N)` count on group buttons |
| `tasks.statusbar.groups.sortAlphabetically` | boolean | `false` | Sort tasks alphabetically in group QuickPick |

## AI Agent Setup (Recommended)

This repo includes an `agent-instruct.txt` file that teaches AI coding agents (Cursor, GitHub Copilot, Aider, etc.) how to set up and optimize your `tasks.json` for TaskBari.

**How to use it:**

1. Copy `agent-instruct.txt` into your project, or reference it directly from this repo.
2. In your AI agent's chat, mention the file to give it context:
   - **Cursor:** Type `@agent-instruct.txt` in the chat prompt, then ask it to set up or improve your tasks.
   - **Other agents:** Paste the file contents or point the agent to it, then ask your question.
3. Example prompts:
   - *"@agent-instruct.txt Please set up a tasks.json for this Node.js project with build, test, and deploy groups."*
   - *"@agent-instruct.txt Migrate my existing tasks.json to use TaskBari groups."*
   - *"@agent-instruct.txt Add a new test coverage task to the Test group."*

The file contains configuration references, group rules, recommended category taxonomies for different project types, migration steps, and a full working example.

## Development

```bash
npm install
npm run compile
# Press F5 in VS Code to launch Extension Development Host
```

## Credits

Inspired by the ecosystem of VS Code task-button extensions that came before it.
