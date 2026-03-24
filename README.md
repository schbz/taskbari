# TaskBari

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/SkySloane.taskbari?label=Marketplace&color=blue)](https://marketplace.visualstudio.com/items?itemName=SkySloane.taskbari)
[![Open VSX](https://img.shields.io/open-vsx/v/SkySloane/taskbari?label=Open%20VSX&color=purple)](https://open-vsx.org/extension/SkySloane/taskbari)

VS Code extension that loads workspace tasks into the status bar — with **category grouping** support.

Inspired by earlier task-button status bar extensions, TaskBari goes further by letting you collapse related tasks into group buttons. Clicking a group opens a QuickPick menu listing all tasks in that category, saving valuable status bar space.

## Features

- **Individual task buttons** on the status bar like other extensions which inspired this one
- **Group buttons** that collapse multiple related tasks into a single status bar button
- **QuickPick submenus** that appear when you click a group button
- **Opt-in "Run all"** option in group QuickPick menus (enabled per group with `runAll: true`)
- Configurable group labels, icons, colors, and sort priority
- Full backward compatibility with existing `tasks.json` configurations

## Install

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=SkySloane.taskbari) or the [Open VSX Registry](https://open-vsx.org/extension/SkySloane/taskbari).

In VS Code press `Ctrl+P` and run:

```
ext install SkySloane.taskbari
```

Editors that use Open VSX (such as Cursor, VSCodium, and Gitpod) can install directly from their built-in extension panel by searching for **TaskBari**.

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

**Tip — let your coding agents do the setup:** Paste the following link into your agent prompt and ask it to create or optimize your `tasks.json` for TaskBari:

```
https://raw.githubusercontent.com/schbz/taskbari/refs/heads/master/agent-instruct.txt
```

The file contains configuration references, group rules, recommended category taxonomies for different project types, and a full working example.

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
        "priority": 10,
        "runAll": true
      }
    }
  }
}
```

| Property   | Type    | Description |
|------------|---------|-------------|
| `id`       | string  | **Required.** Group identifier — tasks with the same id are grouped together. |
| `label`    | string  | Display label for the group button. Defaults to the `id`. |
| `icon`     | string  | Codicon ID (e.g. `tools`, `beaker`, `cloud-upload`). Rendered as `$(icon)` prefix. |
| `color`    | string  | Foreground color — hex value or theme color name. |
| `priority` | number  | Sort order for groups. Higher values appear first. Default: `0`. |
| `runAll`   | boolean | Show a "Run all" option at the top of the group's QuickPick menu. Default: `false`. |

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

1. Copy `agent-instruct.txt` into your project, or reference it directly [https://raw.githubusercontent.com/schbz/taskbari/refs/heads/master/agent-instruct.txt](https://raw.githubusercontent.com/schbz/taskbari/refs/heads/master/agent-instruct.txt).
2. In your AI agent's chat, mention the file to give it context:
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

## Releasing

Publishing runs in GitHub Actions when you push a **version tag** matching `v*` (for example `v1.2.0` after setting `"version": "1.2.0"` in `package.json`). The workflow packages once (`taskbari.vsix`) and publishes that same file to [Open VSX](https://open-vsx.org/extension/SkySloane/taskbari) and the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=SkySloane.taskbari).

You can also run the **Publish Extension** workflow manually from the Actions tab (`workflow_dispatch`). Use that only when the `package.json` version is not already published on both registries.

Configure these [repository secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions):

| Secret | Purpose |
|--------|---------|
| `VSCE_PAT` | [Azure DevOps PAT](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token) with **Marketplace (Manage)** scope for the VS Code Marketplace |
| `OVSX_PAT` | Personal access token from [open-vsx.org user settings](https://open-vsx.org/user-settings/tokens) for publishing to Open VSX ([publishing guide](https://github.com/eclipse/openvsx/wiki/Publishing-Extensions)) |

## Credits

Inspired by the ecosystem of VS Code task-button extensions that came before it.
