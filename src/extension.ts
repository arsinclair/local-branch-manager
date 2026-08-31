import * as vscode from "vscode";

import { BranchItem, BranchTreeProvider, TreeNode } from "./branchTree";
import { deleteLocalBranch, getGitErrorMessage, isUnmergedBranchError } from "./git";

const VIEW_ID = "localBranchManager.branches";

export function activate(context: vscode.ExtensionContext): void {
    const provider = new BranchTreeProvider();
    const view = vscode.window.createTreeView<TreeNode>(VIEW_ID, {
        treeDataProvider: provider,
        showCollapseAll: false
    });
    provider.attachView(view);

    context.subscriptions.push(
        view,
        vscode.commands.registerCommand("localBranchManager.showBranches", async () => {
            await vscode.commands.executeCommand("workbench.view.scm");
            await vscode.commands.executeCommand(`${VIEW_ID}.focus`);
        }),
        vscode.commands.registerCommand("localBranchManager.refresh", () => provider.refresh()),
        vscode.commands.registerCommand(
            "localBranchManager.deleteBranch",
            async (item: BranchItem | undefined) => {
                if (!(item instanceof BranchItem) || item.current) {
                    return;
                }

                try {
                    await deleteLocalBranch(item.repository, item.branchName);
                } catch (error) {
                    if (!isUnmergedBranchError(error)) {
                        void vscode.window.showErrorMessage(getGitErrorMessage(error));
                        return;
                    }

                    const forceChoice = await vscode.window.showWarningMessage(
                        `Branch “${item.branchName}” is not fully merged. Force delete it?`,
                        {
                            modal: true,
                            detail: "Commits reachable only from this branch may become difficult to recover."
                        },
                        "Force Delete"
                    );
                    if (forceChoice !== "Force Delete") {
                        return;
                    }

                    try {
                        await deleteLocalBranch(item.repository, item.branchName, true);
                    } catch (forceError) {
                        void vscode.window.showErrorMessage(getGitErrorMessage(forceError));
                        return;
                    }
                }

                provider.refresh();
                vscode.window.setStatusBarMessage(`Deleted local branch ${item.branchName}`, 3000);
            }
        ),
        vscode.workspace.onDidChangeWorkspaceFolders(() => provider.refresh()),
        view.onDidChangeVisibility((event) => {
            if (event.visible) {
                provider.refresh();
            }
        })
    );
}

export function deactivate(): void {}
