import * as vscode from "vscode";
import { TaskWithId } from "./types";
import { LOG } from "./config";

// --- Task definition computation ---

function computeTaskExecutionId(
  taskInfo: Record<string, unknown>,
  type: string
): string | undefined {
  const props: string[] = [];
  const command = taskInfo.command;
  const args = taskInfo.args;
  props.push(type);

  if (typeof command === "string") {
    props.push(command);
  } else if (Array.isArray(command)) {
    let cmds: string | undefined;
    for (const c of command) {
      if (typeof c === "string") {
        cmds = cmds === undefined ? c : cmds + " " + c;
      }
    }
    if (cmds !== undefined) {
      props.push(cmds);
    }
  } else {
    return undefined;
  }

  if (Array.isArray(args) && args.length > 0) {
    for (const arg of args) {
      if (typeof arg === "string") {
        props.push(arg);
      } else if (typeof arg === "object" && arg !== null && "value" in arg) {
        props.push((arg as { value: string }).value);
      }
    }
  }

  let id = "";
  for (const p of props) {
    id += p.replace(/,/g, ",,") + ",";
  }
  return id;
}

interface TaskDefinition {
  type: string;
  id?: string;
  [key: string]: unknown;
}

function computeTaskExecutionDefinition(
  taskInfo: Record<string, unknown>,
  type: string
): TaskDefinition {
  const id = computeTaskExecutionId(taskInfo, type);
  if (id === undefined) {
    return { type: "$empty" };
  }
  return { type, id };
}

export function computeTaskDefinition(
  taskInfo: Record<string, unknown>
): TaskDefinition | Record<string, unknown> {
  const type = taskInfo.type as string;
  if (type === "shell" || type === "process") {
    return computeTaskExecutionDefinition(taskInfo, type);
  }
  return taskInfo;
}

// --- Equality helpers ---

function deepEqual(a: unknown, b: unknown): boolean {
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object" || a === null || b === null) return a === b;
  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (
      !deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    ) {
      return false;
    }
  }
  return true;
}

function matchDefinition(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): boolean {
  for (const k of Object.keys(a)) {
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
}

// --- Composite / npm matching ---

function matchComposite(
  a: TaskWithId,
  b: Record<string, unknown>
): boolean {
  const aDef = (a as unknown as Record<string, unknown>)
    .definition as Record<string, unknown>;
  if (aDef && aDef.type === "npm") {
    if (b.label === undefined) {
      return a.name === (b as Record<string, unknown>).script;
    }
    return a.name === b.label;
  }
  if ((a as unknown as Record<string, unknown>).detail !== b.detail) {
    return false;
  }
  return a.name === b.label;
}

// --- Public: match a single taskInfo against the fetched task list ---

export function matchTask(
  tasks: TaskWithId[],
  taskInfo: Record<string, unknown>
): TaskWithId | undefined {
  const taskDefinition = computeTaskDefinition(taskInfo);
  for (let i = 0; i < tasks.length; i++) {
    const v = tasks[i];
    if (matchComposite(v, taskInfo)) {
      const vDef = (v as unknown as Record<string, unknown>)
        .definition as Record<string, unknown>;
      if (
        vDef.type === "$empty" ||
        vDef.type === "$composite" ||
        matchDefinition(vDef, taskDefinition as Record<string, unknown>)
      ) {
        tasks.splice(i, 1);
        return v;
      }
    }
  }
  return undefined;
}

// --- Public: match all tasks across scopes ---

export function matchTasksInScope(
  results: { taskObject: TaskWithId; taskInfo: Record<string, unknown> }[],
  tasks: TaskWithId[],
  config: Record<string, unknown> | undefined,
  computeTaskInfoFn: (
    task: Record<string, unknown>,
    cfg: Record<string, unknown>
  ) => Record<string, unknown>,
  getAttributeFn: (
    taskObject: TaskWithId | undefined,
    taskInfo: Record<string, unknown>,
    key: string,
    isRunning?: boolean
  ) => unknown
): void {
  if (
    typeof config !== "object" ||
    config === null ||
    !Array.isArray(config.tasks)
  ) {
    return;
  }
  for (const taskCfg of config.tasks as Record<string, unknown>[]) {
    const taskInfo = computeTaskInfoFn(taskCfg, config);
    const hide = getAttributeFn(undefined, taskInfo, "hide");
    if (hide) continue;

    const taskObject = matchTask(tasks, taskInfo);
    if (!taskObject) {
      const label = getAttributeFn(undefined, taskInfo, "label");
      if (label !== undefined) {
        LOG(`Not found task: ${label}`);
      } else {
        LOG(`Not found task: { type:${(taskCfg as Record<string,unknown>).type} }`);
      }
      continue;
    }
    results.push({ taskObject, taskInfo });
  }
}
