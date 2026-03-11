import * as vscode from "vscode";

/** Raw task configuration as read from tasks.json */
export interface TaskConfig {
  label?: string;
  type?: string;
  command?: string | string[];
  args?: (string | { value: string })[];
  options?: TaskOptions;
  windows?: Partial<TaskConfig>;
  osx?: Partial<TaskConfig>;
  linux?: Partial<TaskConfig>;
  [key: string]: unknown;
}

/** The top-level tasks.json (or workspace-scoped) config block */
export interface TasksFileConfig {
  tasks?: TaskConfig[];
  version?: string;
  windows?: Partial<TasksFileConfig>;
  osx?: Partial<TasksFileConfig>;
  linux?: Partial<TasksFileConfig>;
  [key: string]: unknown;
}

export interface TaskOptions {
  statusbar?: StatusbarOptions;
  [key: string]: unknown;
}

export interface StatusbarOptions {
  label?: string;
  icon?: { id?: string | null };
  color?: string;
  backgroundColor?: string;
  detail?: string;
  hide?: boolean;
  filePattern?: string;
  group?: string | GroupConfig;
  running?: {
    label?: string;
    icon?: { id?: string | null };
    color?: string;
    backgroundColor?: string;
  };
}

/** Detailed group configuration when `group` is an object */
export interface GroupConfig {
  id: string;
  label?: string;
  icon?: string;
  color?: string;
  priority?: number;
}

/** Resolved group info, accumulated from all tasks sharing the same group id */
export interface ResolvedGroup {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  priority: number;
  tasks: MemoryStatusBarEntry[];
}

/** In-memory representation of a single status bar entry before it is applied to a real StatusBarItem */
export interface MemoryStatusBarEntry {
  text: string;
  tooltip: vscode.MarkdownString | undefined;
  color: string | vscode.ThemeColor | undefined;
  backgroundColor: vscode.ThemeColor | undefined;
  filePattern: string | undefined;
  command: string | vscode.Command;
  groupId?: string;
  /** Dot-separated sub-section within the group, e.g. "Unit" from group "Test.Unit" */
  subSection?: string;
  /** Whether this task is currently executing */
  isRunning?: boolean;
}

/** A VS Code Task augmented with the internal `_id` property used for matching */
export interface TaskWithId extends vscode.Task {
  _id: string;
}

/** Map attribute names to their fallback property on the vscode.Task object */
export const ObjectAttribute: Record<string, string> = {
  label: "name",
  detail: "detail",
};

/** Attributes that can be read directly from taskInfo when present */
export const VSCodeAttribute: Record<string, boolean> = {
  label: true,
  icon: true,
  detail: true,
  hide: true,
};

/** Attributes that fall back to the `tasks.statusbar.default.*` settings */
export const HasDefaultAttribute: Record<string, boolean> = {
  hide: true,
  color: true,
};
