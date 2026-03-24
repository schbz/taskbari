# Changelog

## 1.1.1

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
