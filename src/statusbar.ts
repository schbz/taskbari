import * as vscode from "vscode";
import { MemoryStatusBarEntry, ResolvedGroup, TaskWithId } from "./types";
import {
  LOG,
  getAttribute,
  convertColor,
  convertTooltip,
  computeTaskInfo,
  getGroupConfig,
} from "./config";
import { matchTasksInScope } from "./taskMatcher";
import {
  collectGroups,
  applyGroupOverrides,
  mergeEntries,
  SelectGroupTaskCommand,
} from "./groups";

export const RunTaskCommand = "taskbari.run-task";
export const SelectTaskCommand = "taskbari.select-task";

let statusBarArray: vscode.StatusBarItem[] = [];
let selectList: { label: string; description?: string; task: vscode.Task }[] =
  [];
let eventChangeActiveTextEditor: vscode.Disposable | undefined;

/** The latest resolved groups, kept alive so the QuickPick command can read them */
let currentGroups: Map<string, ResolvedGroup> = new Map();

export function getCurrentGroups(): Map<string, ResolvedGroup> {
  return currentGroups;
}

export function getSelectList(): typeof selectList {
  return selectList;
}

// --- Visibility management ---

function needShowStatusBar(
  entry: MemoryStatusBarEntry & { filePattern?: string },
  currentFilePath: string | undefined
): boolean {
  try {
    return (
      !entry.filePattern ||
      (!!currentFilePath && new RegExp(entry.filePattern).test(currentFilePath))
    );
  } catch (error: unknown) {
    const e = error as Error;
    LOG(
      `Error validating status bar item '${entry.text}' filePattern for active file '${currentFilePath}'. ${e.name}: ${e.message}`
    );
  }
  return false;
}

/** Re-evaluate which status bar items should be visible based on active editor and limit */
export function updateStatusBar(): void {
  for (const sb of statusBarArray) {
    sb.hide();
  }
  selectList = [];

  const settings = vscode.workspace.getConfiguration("tasks.statusbar");
  let count = 0;
  const currentFilePath =
    vscode.window.activeTextEditor?.document.fileName;

  for (let i = 0; i < statusBarArray.length - 1; i++) {
    const sb = statusBarArray[i];
    const entry = (sb as unknown as { _memEntry?: MemoryStatusBarEntry })
      ._memEntry;
    if (!entry || !needShowStatusBar(entry, currentFilePath)) continue;

    const limit = settings.get<number | null>("limit", null);
    if (typeof limit === "number" && limit <= count) {
      selectList.push({
        label: sb.text,
        description: sb.tooltip
          ? (sb.tooltip as vscode.MarkdownString).value
          : undefined,
        task: ((sb.command as vscode.Command).arguments?.[0]) as vscode.Task,
      });
    } else {
      sb.show();
      count++;
    }
  }

  if (selectList.length > 0) {
    statusBarArray[statusBarArray.length - 1].show();
  }
}

export function openUpdateStatusBar(): void {
  if (eventChangeActiveTextEditor === undefined) {
    eventChangeActiveTextEditor =
      vscode.window.onDidChangeActiveTextEditor(updateStatusBar);
  }
  updateStatusBar();
}

export function closeUpdateStatusBar(): void {
  if (eventChangeActiveTextEditor !== undefined) {
    eventChangeActiveTextEditor.dispose();
    eventChangeActiveTextEditor = undefined;
  }
}

export function cleanStatusBar(): void {
  statusBarArray.forEach((sb) => {
    sb.hide();
    sb.dispose();
  });
  statusBarArray = [];
}

// --- Sync in-memory entries to real StatusBarItems ---

function createSelectStatusBar(): MemoryStatusBarEntry {
  const settings = vscode.workspace.getConfiguration(
    "tasks.statusbar.select"
  );
  return {
    text: settings.get<string>("label", "...") || "...",
    tooltip: undefined,
    color: convertColor(settings.get<string>("color", "")),
    backgroundColor: undefined,
    filePattern: undefined,
    command: SelectTaskCommand,
  };
}

function syncStatusBar(memoryEntries: MemoryStatusBarEntry[]): void {
  const diff = memoryEntries.length - statusBarArray.length;
  for (let i = 0; i < diff; i++) {
    const sb = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      50
    );
    sb.name = "TaskBari";
    statusBarArray.push(sb);
  }
  for (let i = 0; i < -diff; i++) {
    const sb = statusBarArray.pop()!;
    sb.hide();
    sb.dispose();
  }

  for (let i = 0; i < memoryEntries.length; i++) {
    const to = statusBarArray[i];
    const from = memoryEntries[i];
    to.text = from.text;
    to.tooltip = from.tooltip;
    to.color = from.color;
    to.backgroundColor = from.backgroundColor;
    to.command = from.command;
    // Stash the entry for filePattern checks in updateStatusBar
    (to as unknown as { _memEntry: MemoryStatusBarEntry })._memEntry = from;
  }
}

// --- Build the full memory array from matched tasks ---

function buildMemoryEntries(
  matchedPairs: { taskObject: TaskWithId; taskInfo: Record<string, unknown> }[],
  runningTasks: Record<string, boolean>
): MemoryStatusBarEntry[] {
  const entries: MemoryStatusBarEntry[] = [];
  const groupOverrides = new Map<
    string,
    { label?: string; icon?: string; color?: string; priority?: number; runAll?: boolean }
  >();

  for (const { taskObject, taskInfo } of matchedPairs) {
    const isRunning = runningTasks[taskObject._id] ?? false;
    let label = getAttribute(taskObject, taskInfo, "label", isRunning) as
      | string
      | undefined;
    const icon = getAttribute(taskObject, taskInfo, "icon", isRunning) as
      | { id?: string }
      | undefined;
    if (icon?.id) {
      label = `$(${icon.id}) ${label ?? ""}`;
    }
    const detail = getAttribute(taskObject, taskInfo, "detail") as
      | string
      | undefined;
    const color = getAttribute(taskObject, taskInfo, "color", isRunning);
    const backgroundColor = getAttribute(
      taskObject,
      taskInfo,
      "backgroundColor",
      isRunning
    ) as string | undefined;
    const filePattern = getAttribute(taskObject, taskInfo, "filePattern") as
      | string
      | undefined;

    const groupCfg = getGroupConfig(taskInfo);
    const groupId = groupCfg?.id;

    if (groupCfg && !groupOverrides.has(groupCfg.id)) {
      if (groupCfg.label || groupCfg.icon || groupCfg.color || groupCfg.priority !== undefined || groupCfg.runAll !== undefined) {
        groupOverrides.set(groupCfg.id, {
          label: groupCfg.label,
          icon: groupCfg.icon,
          color: groupCfg.color,
          priority: groupCfg.priority,
          runAll: groupCfg.runAll,
        });
      }
    }

    entries.push({
      text: label ?? taskObject.name,
      tooltip: convertTooltip(detail) ?? convertTooltip(taskObject.name),
      color: convertColor(color),
      backgroundColor: backgroundColor
        ? new vscode.ThemeColor(backgroundColor)
        : undefined,
      filePattern,
      command: {
        title: label ?? taskObject.name,
        command: RunTaskCommand,
        arguments: [taskObject],
      },
      groupId,
      isRunning,
    });
  }

  const { ungrouped, groups } = collectGroups(entries);
  applyGroupOverrides(groups, groupOverrides);
  currentGroups = groups;

  return mergeEntries(ungrouped, groups);
}

// --- Top-level load pipeline ---

export function matchAllTasks(
  tasks: TaskWithId[]
): MemoryStatusBarEntry[] {
  const runningTasks: Record<string, boolean> = {};
  for (const e of vscode.tasks.taskExecutions) {
    runningTasks[(e.task as TaskWithId)._id] = true;
  }

  const matchedPairs: {
    taskObject: TaskWithId;
    taskInfo: Record<string, unknown>;
  }[] = [];

  const configuration = vscode.workspace.getConfiguration();
  if (configuration) {
    const tasksJson = configuration.inspect("tasks");
    if (tasksJson) {
      if (tasksJson.globalValue) {
        matchTasksInScope(
          matchedPairs,
          tasks,
          tasksJson.globalValue as Record<string, unknown>,
          computeTaskInfo as (
            t: Record<string, unknown>,
            c: Record<string, unknown>
          ) => Record<string, unknown>,
          getAttribute
        );
      }
      if (tasksJson.workspaceValue) {
        matchTasksInScope(
          matchedPairs,
          tasks,
          tasksJson.workspaceValue as Record<string, unknown>,
          computeTaskInfo as (
            t: Record<string, unknown>,
            c: Record<string, unknown>
          ) => Record<string, unknown>,
          getAttribute
        );
      }
    }
  }

  if (vscode.workspace.workspaceFile !== undefined && vscode.workspace.workspaceFolders) {
    for (const workspaceFolder of vscode.workspace.workspaceFolders) {
      const folderConfig = vscode.workspace.getConfiguration(
        undefined,
        workspaceFolder.uri
      );
      if (folderConfig) {
        const tasksJson = folderConfig.inspect("tasks");
        if (tasksJson?.workspaceFolderValue) {
          matchTasksInScope(
            matchedPairs,
            tasks,
            tasksJson.workspaceFolderValue as Record<string, unknown>,
            computeTaskInfo as (
              t: Record<string, unknown>,
              c: Record<string, unknown>
            ) => Record<string, unknown>,
            getAttribute
          );
        }
      }
    }
  }

  for (const task of tasks) {
    LOG(`No match task: ${task.name}`);
  }

  return buildMemoryEntries(matchedPairs, runningTasks);
}

export function loadTasks(): void {
  if (vscode.workspace.workspaceFolders === undefined) {
    cleanStatusBar();
    closeUpdateStatusBar();
    return;
  }

  vscode.tasks.fetchTasks().then((tasks) => {
    const workspaceTasks = tasks.filter(
      (t) => t.source === "Workspace"
    ) as TaskWithId[];
    const memoryEntries = matchAllTasks(workspaceTasks);
    if (memoryEntries.length > 0) {
      memoryEntries.push(createSelectStatusBar());
      syncStatusBar(memoryEntries);
      openUpdateStatusBar();
    } else {
      cleanStatusBar();
      closeUpdateStatusBar();
    }
  });
}

// --- Refresh on task start/stop (rebuild to update running indicators) ---

export function refreshTask(task: vscode.Task): void {
  if (task.source !== "Workspace") return;
  loadTasks();
}

// --- Debounced loading ---

const MIN_FETCH_INTERVAL = 1000;
let fetchLastTime = 0;
let fetchTimer: ReturnType<typeof setTimeout> | undefined;

function loadTasksDelay(timeout: number): void {
  if (fetchTimer !== undefined) {
    clearTimeout(fetchTimer);
  }
  fetchTimer = setTimeout(() => {
    fetchTimer = undefined;
    fetchLastTime = Date.now();
    loadTasks();
  }, timeout);
}

export function loadTasksWait(): void {
  const now = Date.now();
  if (now < fetchLastTime + MIN_FETCH_INTERVAL) {
    loadTasksDelay(MIN_FETCH_INTERVAL);
  } else {
    if (fetchTimer === undefined) {
      fetchLastTime = now;
      loadTasks();
    }
  }
}

export function loadTasksInitial(): void {
  loadTasksDelay(0);
}
