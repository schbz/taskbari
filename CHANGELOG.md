# Changelog

## Unreleased

- Distribution is now Open VSX only. Removed the VS Code Marketplace badge, install instructions, and publish step; its Azure DevOps PAT expires yearly and the rotation was not worth the upkeep.
- README documents installing the packaged `taskbari.vsix` manually for editors that do not use Open VSX
- `npm run deploy` now packages and publishes to Open VSX, matching what CI does

## 1.2.0

- **Unified button ordering:** group buttons and single-click task buttons are now sorted on one shared priority scale. Previously every group was forced to the left of every individual task, so a single task could never be placed first or between groups.
- Added `options.statusbar.priority` for individual tasks — higher values appear further left, using the same scale as the group `priority`
- On a task that also sets `group`, `priority` orders that entry inside the group's QuickPick menu
- Sort order: priority descending → groups before tasks on a tie → groups alphabetically by id → tasks in `tasks.json` order
- **No migration needed.** A task without an explicit `priority` keeps its old position, after every group and every prioritized task, in `tasks.json` order — which is exactly the previous layout rule. Existing configurations render identically, including ones using negative group priorities.
- Added `priority` to the `tasks.json` JSON schema for autocomplete and hover docs
- Fixed CI: the workflow triggered on `main` but the repository's default branch is `master`, so it never ran
- Synced `package-lock.json`, which was stale at `1.0.0`

## 1.1.2

- Fixed CI: upgraded Node from 18 to 20 (required by `undici` / `@vscode/vsce`)
- Added missing `description` fields to five configuration settings so they appear in the Settings UI
- Individual (ungrouped) task buttons now show a default tooltip with the task name
- Added `--skip-duplicate` to CI publish steps for idempotent releases
- Expanded `keywords` in `package.json` for better marketplace discoverability

## 1.1.0

- "Run all" in group QuickPick is now opt-in via `runAll: true` in the group object config (defaults to `false`)
- **Breaking:** "Run all" no longer appears by default; add `"runAll": true` to your group object to restore it
- Added `runAll` property to `GroupConfig` and JSON schema

## 1.0.1

- Added extension icon

## 1.0.0

- Initial public release
- Individual task buttons on the status bar from `.vscode/tasks.json`
- Group property collapses related tasks into a single status bar button
- Group buttons open a QuickPick submenu listing all tasks in the group
- Group configuration supports `id`, `label`, `icon`, `color`, and `priority`
- Dot-notation sub-sections (e.g. `Test.Unit`, `Test.E2E`) with QuickPick separators
- Running task indicators on group buttons (spinner icon and running/total count)
- "Run all" option at the top of every group QuickPick
- `tasks.statusbar.groups.showTaskCount` setting
- `tasks.statusbar.groups.sortAlphabetically` setting
- Full backward compatibility with existing `tasks.json` configurations
- TypeScript codebase
