import * as vscode from "vscode";
import { TaskWithId } from "./types";
import { LOG, disposeOutputChannel } from "./config";
import { showGroupQuickPick, SelectGroupTaskCommand, RunAllInGroupCommand } from "./groups";
import {
  RunTaskCommand,
  SelectTaskCommand,
  loadTasksWait,
  loadTasksInitial,
  refreshTask,
  cleanStatusBar,
  closeUpdateStatusBar,
  getCurrentGroups,
  getSelectList,
} from "./statusbar";

function runTask(task: vscode.Task): void {
  const thenable = vscode.tasks.executeTask(task);
  Promise.resolve(thenable).catch((err: Error) => {
    vscode.window.showWarningMessage(err.message).then(() => undefined);
  });
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      RunTaskCommand,
      (args: unknown) => {
        if (typeof args === "number") {
          // Not used in normal flow, but kept for compatibility
          LOG(`run-task called with number: ${args}`);
        } else if (typeof args === "object" && args !== null) {
          runTask(args as vscode.Task);
        } else {
          LOG(`Invalid task argument: ${args}`);
        }
      }
    ),

    vscode.commands.registerCommand(SelectTaskCommand, () => {
      const list = getSelectList();
      vscode.window
        .showQuickPick(list, { placeHolder: "Select task to execute" })
        .then((value) => {
          if (value !== undefined) {
            runTask(value.task);
          }
        });
    }),

    vscode.commands.registerCommand(
      SelectGroupTaskCommand,
      (groupId: string) => {
        showGroupQuickPick(groupId, getCurrentGroups(), runTask);
      }
    ),

    vscode.commands.registerCommand(
      RunAllInGroupCommand,
      (groupId: string) => {
        const group = getCurrentGroups().get(groupId);
        if (!group) return;
        for (const entry of group.tasks) {
          const cmd = entry.command as vscode.Command;
          const task = cmd.arguments?.[0] as vscode.Task | undefined;
          if (task) {
            runTask(task);
          }
        }
      }
    ),

    vscode.workspace.onDidChangeConfiguration(loadTasksWait),
    vscode.workspace.onDidChangeWorkspaceFolders(loadTasksWait),
    vscode.tasks.onDidStartTask((e) => {
      refreshTask(e.execution.task);
    }),
    vscode.tasks.onDidEndTask((e) => {
      refreshTask(e.execution.task);
    })
  );

  loadTasksInitial();
}

export function deactivate(): void {
  closeUpdateStatusBar();
  cleanStatusBar();
  disposeOutputChannel();
}
