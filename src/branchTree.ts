import * as path from "node:path";

import * as vscode from "vscode";

import { findRepository, getLocalBranches } from "./git";

export class RepositoryItem extends vscode.TreeItem {
    public constructor(
        public readonly repository: string,
        public readonly branches: BranchItem[]
    ) {
        super(path.basename(repository), vscode.TreeItemCollapsibleState.Expanded);
        this.description = repository;
        this.contextValue = "localBranchManager.repository";
        this.iconPath = new vscode.ThemeIcon("repo");
    }
}

export class BranchItem extends vscode.TreeItem {
    public constructor(
        public readonly repository: string,
        public readonly branchName: string,
        public readonly current: boolean,
        public readonly merged: boolean
    ) {
        super(branchName, vscode.TreeItemCollapsibleState.None);
        this.contextValue = current
            ? "localBranchManager.currentBranch"
            : "localBranchManager.deletableBranch";
        this.description = current ? "current" : undefined;
        this.iconPath = current
            ? new vscode.ThemeIcon("check")
            : merged
              ? new vscode.ThemeIcon("git-branch")
              : new vscode.ThemeIcon("circle-filled", new vscode.ThemeColor("charts.yellow"));
        this.tooltip = current
            ? `${branchName} (currently checked out)`
            : merged
              ? `${branchName} (merged into HEAD)`
              : `${branchName} (not merged into HEAD)`;
    }
}

export type TreeNode = RepositoryItem | BranchItem;

export class BranchTreeProvider implements vscode.TreeDataProvider<TreeNode> {
    private readonly changed = new vscode.EventEmitter<TreeNode | undefined | void>();
    public readonly onDidChangeTreeData = this.changed.event;
    private view: vscode.TreeView<TreeNode> | undefined;

    public attachView(view: vscode.TreeView<TreeNode>): void {
        this.view = view;
    }

    public refresh(): void {
        this.changed.fire();
    }

    public getTreeItem(element: TreeNode): vscode.TreeItem {
        return element;
    }

    public async getChildren(element?: TreeNode): Promise<TreeNode[]> {
        if (element instanceof RepositoryItem) {
            return element.branches;
        }

        if (element instanceof BranchItem) {
            return [];
        }

        const folders = vscode.workspace.workspaceFolders ?? [];
        if (folders.length === 0) {
            if (this.view) {
                this.view.message = "Open a folder containing a Git repository.";
            }
            return [];
        }

        const roots = await Promise.all(folders.map((folder) => findRepository(folder.uri.fsPath)));
        const repositories = [...new Set(roots.filter((root): root is string => Boolean(root)))];

        if (repositories.length === 0) {
            if (this.view) {
                this.view.message = "No Git repository found in the open workspace.";
            }
            return [];
        }

        try {
            const items = await Promise.all(
                repositories.map(async (repository) => {
                    const branches = (await getLocalBranches(repository)).map(
                        (branch) =>
                            new BranchItem(repository, branch.name, branch.current, branch.merged)
                    );
                    return new RepositoryItem(repository, branches);
                })
            );

            if (this.view) {
                this.view.message = undefined;
            }
            if (items.length === 1) {
                return items[0].branches;
            }
            return items;
        } catch (error) {
            if (this.view) {
                this.view.message = `Unable to read local branches: ${String(error)}`;
            }
            return [];
        }
    }
}
