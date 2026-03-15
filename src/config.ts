import * as vscode from "vscode";
import * as os from "os";
import {
  TaskConfig,
  TasksFileConfig,
  TaskWithId,
  ObjectAttribute,
  VSCodeAttribute,
  HasDefaultAttribute,
  StatusbarOptions,
} from "./types";

const platform = os.platform();

let outputChannel: vscode.OutputChannel | undefined;

export function LOG(msg: string): void {
  if (outputChannel === undefined) {
    outputChannel = vscode.window.createOutputChannel("TaskBari");
  }
  outputChannel.appendLine(msg);
}

export function disposeOutputChannel(): void {
  if (outputChannel !== undefined) {
    outputChannel.dispose();
    outputChannel = undefined;
  }
}

export function getPlatformValue<T extends Record<string, unknown>>(
  t: T
): Partial<T> | undefined {
  if (platform === "win32") {
    return t.windows as Partial<T> | undefined;
  } else if (platform === "darwin") {
    return t.osx as Partial<T> | undefined;
  } else {
    return t.linux as Partial<T> | undefined;
  }
}

function isObject(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === "object" && obj !== null && !Array.isArray(obj);
}

/**
 * Resolve an attribute from the task's statusbar options, falling back through
 * running overrides -> statusbar options -> task object properties -> VS Code
 * task fields -> default settings.
 */
export function getAttribute(
  taskObject: TaskWithId | undefined,
  taskInfo: Record<string, unknown>,
  key: string,
  isRunning?: boolean
): unknown {
  const opts = taskInfo.options as Record<string, unknown> | undefined;
  if (isObject(opts)) {
    const sb = opts.statusbar as Record<string, unknown> | undefined;
    if (isObject(sb)) {
      if (isRunning && isObject(sb.running)) {
        const running = sb.running as Record<string, unknown>;
        if (key in running) {
          return running[key];
        }
      }
      if (key in sb) {
        return sb[key];
      }
    }
  }

  if (taskObject !== undefined && key in ObjectAttribute) {
    const objectKey = ObjectAttribute[key];
    if (objectKey in taskObject) {
      return (taskObject as unknown as Record<string, unknown>)[objectKey];
    }
  }

  if (key in VSCodeAttribute) {
    if (key in taskInfo) {
      return taskInfo[key];
    }
  }

  if (key in HasDefaultAttribute) {
    const settings = vscode.workspace.getConfiguration(
      "tasks.statusbar.default"
    );
    if (settings === undefined) {
      return undefined;
    }
    return settings.get(key);
  }

  return undefined;
}

export function convertColor(
  color: unknown
): string | vscode.ThemeColor | undefined {
  if (typeof color === "string") {
    if (color.startsWith("#")) {
      return color;
    } else if (color === "") {
      return undefined;
    } else {
      return new vscode.ThemeColor(color);
    }
  }
  return undefined;
}

export function convertTooltip(
  tooltip: unknown
): vscode.MarkdownString | undefined {
  if (typeof tooltip === "string" && tooltip) {
    const md = new vscode.MarkdownString(tooltip);
    md.isTrusted = true;
    md.supportThemeIcons = true;
    return md;
  }
  return undefined;
}

// --- Deep clone / copy utilities (ported from original) ---

export function deepClone(a: unknown, b: unknown): unknown {
  if (typeof b !== "object" || !b) {
    return b;
  }
  if (Array.isArray(b)) {
    return b.slice();
  }
  const base = typeof a === "object" && a ? (a as Record<string, unknown>) : {};
  const src = b as Record<string, unknown>;
  const o: Record<string, unknown> = {};
  for (const k of Object.keys(base)) {
    o[k] = base[k];
  }
  for (const k of Object.keys(src)) {
    o[k] = deepClone(o[k], src[k]);
  }
  return o;
}

export function copyObject(
  t: Record<string, unknown>,
  a: Record<string, unknown>
): void {
  for (const k of Object.keys(a)) {
    t[k] = deepClone(t[k], a[k]);
  }
}

export function copyObjectWithIgnore(
  t: Record<string, unknown>,
  a: Record<string, unknown>,
  ignore: Record<string, boolean>
): void {
  for (const k of Object.keys(a)) {
    if (!(k in ignore)) {
      t[k] = deepClone(t[k], a[k]);
    }
  }
}

const IGNORE_GLOBALS: Record<string, boolean> = {
  tasks: true,
  version: true,
  windows: true,
  osx: true,
  linux: true,
};

const IGNORE_LOCALS: Record<string, boolean> = {
  windows: true,
  osx: true,
  linux: true,
};

/**
 * Merge global config + platform overrides + per-task config + per-task
 * platform overrides into a single resolved task info object.
 */
export function computeTaskInfo(
  task: TaskConfig,
  config: TasksFileConfig
): Record<string, unknown> {
  const t: Record<string, unknown> = {};
  copyObjectWithIgnore(t, config as Record<string, unknown>, IGNORE_GLOBALS);
  const platformGlobal = getPlatformValue(config as Record<string, unknown>);
  if (platformGlobal) {
    copyObject(t, platformGlobal as Record<string, unknown>);
  }
  copyObjectWithIgnore(t, task as Record<string, unknown>, IGNORE_LOCALS);
  const platformLocal = getPlatformValue(task as Record<string, unknown>);
  if (platformLocal) {
    copyObject(t, platformLocal as Record<string, unknown>);
  }
  if (t.type === undefined) {
    t.type = "process";
  }
  return t;
}

/**
 * Extract the group configuration from a resolved task info, returning
 * undefined if no group is set.
 */
export function getGroupConfig(
  taskInfo: Record<string, unknown>
): { id: string; label?: string; icon?: string; color?: string; priority?: number; runAll?: boolean } | undefined {
  const opts = taskInfo.options as Record<string, unknown> | undefined;
  if (!isObject(opts)) return undefined;
  const sb = opts.statusbar as StatusbarOptions | undefined;
  if (!isObject(sb) || sb.group === undefined) return undefined;

  if (typeof sb.group === "string") {
    return { id: sb.group };
  }
  if (isObject(sb.group) && typeof sb.group.id === "string") {
    return {
      id: sb.group.id,
      label: sb.group.label as string | undefined,
      icon: sb.group.icon as string | undefined,
      color: sb.group.color as string | undefined,
      priority: sb.group.priority as number | undefined,
      runAll: sb.group.runAll as boolean | undefined,
    };
  }
  return undefined;
}
