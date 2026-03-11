# Changelog

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
