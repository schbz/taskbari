import * as vscode from "vscode";
import { MemoryStatusBarEntry, ResolvedGroup, TaskWithId } from "./types";
import { convertColor, convertTooltip } from "./config";

export const SelectGroupTaskCommand = "taskbari.select-group-task";
export const RunAllInGroupCommand = "taskbari.run-all-in-group";

/**
 * Parse a group id that may use dot notation for sub-sections.
 * "Test.Unit" -> { rootId: "Test", subSection: "Unit" }
 * "Test"      -> { rootId: "Test", subSection: undefined }
 */
export function parseGroupId(raw: string): { rootId: string; subSection?: string } {
  const dotIdx = raw.indexOf(".");
  if (dotIdx === -1) {
    return { rootId: raw };
  }
  return {
    rootId: raw.substring(0, dotIdx),
    subSection: raw.substring(dotIdx + 1),
  };
}

/**
 * Collect individual MemoryStatusBarEntries into groups.
 * Supports dot-notation sub-sections: "Build.Frontend" groups under "Build"
 * with subSection="Frontend".
 */
export function collectGroups(
  entries: MemoryStatusBarEntry[]
): { ungrouped: MemoryStatusBarEntry[]; groups: Map<string, ResolvedGroup> } {
  const groups = new Map<string, ResolvedGroup>();
  const ungrouped: MemoryStatusBarEntry[] = [];

  for (const entry of entries) {
    if (!entry.groupId) {
      ungrouped.push(entry);
      continue;
    }

    const { rootId, subSection } = parseGroupId(entry.groupId);
    entry.subSection = subSection;

    let group = groups.get(rootId);
    if (!group) {
      group = {
        id: rootId,
        label: rootId,
        priority: 0,
        tasks: [],
      };
      groups.set(rootId, group);
    }
    group.tasks.push(entry);
  }

  return { ungrouped, groups };
}

/**
 * Apply group-level overrides (label, icon, color, priority) parsed from the
 * first task that provides a detailed GroupConfig object.
 * Overrides keyed by dotted id (e.g. "Build.Frontend") apply to the root "Build".
 */
export function applyGroupOverrides(
  groups: Map<string, ResolvedGroup>,
  overrides: Map<
    string,
    { label?: string; icon?: string; color?: string; priority?: number; runAll?: boolean }
  >
): void {
  for (const [rawId, cfg] of overrides) {
    const { rootId } = parseGroupId(rawId);
    const group = groups.get(rootId);
    if (!group) continue;
    if (cfg.label && group.label === group.id) group.label = cfg.label;
    if (cfg.icon && !group.icon) group.icon = cfg.icon;
    if (cfg.color && !group.color) group.color = cfg.color;
    if (cfg.priority !== undefined && group.priority === 0) group.priority = cfg.priority;
    if (cfg.runAll !== undefined && group.runAll === undefined) group.runAll = cfg.runAll;
  }
}

/**
 * Build a single MemoryStatusBarEntry for a group that, when clicked,
 * triggers the group QuickPick command.
 * Shows running task count with a spinner when any tasks in the group are executing.
 */
export function buildGroupEntry(group: ResolvedGroup): MemoryStatusBarEntry {
  const showCount = vscode.workspace
    .getConfiguration("tasks.statusbar.groups")
    .get<boolean>("showTaskCount", true);

  const runningCount = group.tasks.filter((t) => t.isRunning).length;

  let text = group.label;
  if (group.icon) {
    if (runningCount > 0) {
      text = `$(sync~spin) ${text}`;
    } else {
      text = `$(${group.icon}) ${text}`;
    }
  } else if (runningCount > 0) {
    text = `$(sync~spin) ${text}`;
  }

  if (showCount) {
    if (runningCount > 0) {
      text += ` (${runningCount}/${group.tasks.length})`;
    } else {
      text += ` (${group.tasks.length})`;
    }
  }

  const tooltipParts = [`**${group.id}** — click to pick a task`];
  if (runningCount > 0) {
    tooltipParts.push(`\n\n$(sync~spin) ${runningCount} running`);
  }
  const taskList = sortTasksByPriority(group.tasks)
    .map((t) => `- ${t.isRunning ? "$(sync~spin) " : ""}${t.text}`)
    .join("\n");
  tooltipParts.push(`\n\n${taskList}`);

  return {
    text,
    tooltip: convertTooltip(tooltipParts.join("")),
    color: convertColor(group.color),
    backgroundColor: undefined,
    filePattern: undefined,
    command: {
      title: `Select task from ${group.id}`,
      command: SelectGroupTaskCommand,
      arguments: [group.id],
    },
  };
}

/**
 * Sort priority used for an ungrouped task that does not declare one.
 * Keeps the pre-1.2 layout: unprioritized single-task buttons sit after every
 * group and every prioritized task, in tasks.json declaration order.
 */
const UNPRIORITIZED = Number.NEGATIVE_INFINITY;

interface OrderSlot {
  entry: MemoryStatusBarEntry;
  priority: number;
  isGroup: boolean;
  /** Group id, used for the alphabetical tiebreak between groups */
  id: string;
  /** Declaration order, used for the stable tiebreak between tasks */
  index: number;
}

/**
 * Merge ungrouped entries + one entry per group into a single ordered array.
 *
 * Group buttons and single-task buttons share ONE ordering scale, so a task can
 * be placed before, between, or after groups by giving it a priority. Sorting:
 *   1. priority, descending
 *   2. on a tie, group buttons before task buttons
 *   3. group vs group: alphabetically by id
 *   4. task vs task: tasks.json declaration order
 *
 * A task without an explicit priority is UNPRIORITIZED, which reproduces the
 * previous "all groups first, then tasks" layout for existing configs.
 */
export function mergeEntries(
  ungrouped: MemoryStatusBarEntry[],
  groups: Map<string, ResolvedGroup>
): MemoryStatusBarEntry[] {
  const slots: OrderSlot[] = [];
  let index = 0;

  for (const group of groups.values()) {
    slots.push({
      entry: buildGroupEntry(group),
      priority: group.priority,
      isGroup: true,
      id: group.id,
      index: index++,
    });
  }
  for (const entry of ungrouped) {
    slots.push({
      entry,
      priority: entry.priority ?? UNPRIORITIZED,
      isGroup: false,
      id: entry.text,
      index: index++,
    });
  }

  slots.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    if (a.isGroup !== b.isGroup) return a.isGroup ? -1 : 1;
    if (a.isGroup) return a.id.localeCompare(b.id);
    return a.index - b.index;
  });

  return slots.map((s) => s.entry);
}

/**
 * Order the tasks inside a group by their explicit `priority` (descending).
 * Tasks without one keep declaration order, after the prioritized ones.
 */
export function sortTasksByPriority(
  tasks: MemoryStatusBarEntry[]
): MemoryStatusBarEntry[] {
  return tasks
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const pa = a.entry.priority ?? UNPRIORITIZED;
      const pb = b.entry.priority ?? UNPRIORITIZED;
      if (pa !== pb) return pb - pa;
      return a.index - b.index;
    })
    .map((s) => s.entry);
}

// --- QuickPick handler ---

interface GroupQuickPickItem extends vscode.QuickPickItem {
  task?: TaskWithId;
  isRunAll?: boolean;
}

/**
 * Organize tasks by sub-section for display with separators.
 * Tasks without a subSection go into the "" bucket.
 */
function organizeBySubSection(
  tasks: MemoryStatusBarEntry[]
): Map<string, MemoryStatusBarEntry[]> {
  const sections = new Map<string, MemoryStatusBarEntry[]>();
  for (const t of tasks) {
    const key = t.subSection ?? "";
    let arr = sections.get(key);
    if (!arr) {
      arr = [];
      sections.set(key, arr);
    }
    arr.push(t);
  }
  return sections;
}

/**
 * Show a QuickPick listing all tasks in a group and execute the selected one.
 * Includes a "Run all" option at the top and sub-section separators.
 */
export function showGroupQuickPick(
  groupId: string,
  groups: Map<string, ResolvedGroup>,
  runTaskFn: (task: vscode.Task) => void
): void {
  const group = groups.get(groupId);
  if (!group) return;

  const sortAlpha = vscode.workspace
    .getConfiguration("tasks.statusbar.groups")
    .get<boolean>("sortAlphabetically", false);

  const tasks = sortAlpha
    ? [...group.tasks].sort((a, b) => a.text.localeCompare(b.text))
    : sortTasksByPriority(group.tasks);

  const items: GroupQuickPickItem[] = [];

  if (group.runAll) {
    items.push({
      label: `$(run-all) Run all ${tasks.length} tasks`,
      description: `in ${group.id}`,
      isRunAll: true,
    });
  }

  // Organize by sub-section
  const sections = organizeBySubSection(tasks);
  const hasSubSections = sections.size > 1 || (sections.size === 1 && !sections.has(""));

  for (const [sectionName, sectionTasks] of sections) {
    if (hasSubSections) {
      items.push({
        label: sectionName || "General",
        kind: vscode.QuickPickItemKind.Separator,
      });
    }

    for (const entry of sectionTasks) {
      const cmd = entry.command as vscode.Command;
      const runningPrefix = entry.isRunning ? "$(sync~spin) " : "";
      items.push({
        label: `${runningPrefix}${entry.text}`,
        description: entry.isRunning ? "running" : entry.tooltip?.value,
        task: cmd.arguments?.[0] as TaskWithId,
      });
    }
  }

  vscode.window
    .showQuickPick(items, {
      placeHolder: `Select task from "${group.id}"`,
    })
    .then((value) => {
      if (!value) return;
      if (value.isRunAll) {
        for (const entry of group.tasks) {
          const cmd = entry.command as vscode.Command;
          const task = cmd.arguments?.[0] as TaskWithId | undefined;
          if (task) {
            runTaskFn(task);
          }
        }
      } else if (value.task) {
        runTaskFn(value.task);
      }
    });
}
