# Local Branch Manager

A small VS Code extension that lists local Git branches in the **Source Control** sidebar and puts a delete button beside every branch that is not currently checked out.

## Features

- Lists all local branches, with the current branch first.
- Adds an inline trash button to every other branch.
- Uses Git's safe delete first (`git branch -d`).
- Offers force deletion only when Git reports that a branch is not fully merged.
- Supports multi-root workspaces by grouping branches by repository.
- Refreshes when the view is reopened, when workspace folders change, or when you click refresh.
- Adds a Git branch button to the Source Control title bar that reveals the view if it is hidden.

The currently checked-out branch is labeled `current` and cannot be deleted. Git also prevents deletion of a branch checked out in another worktree; its error is shown without modifying that worktree.

If **Local Branches** is not visible, click the Git branch button in the Source Control title bar or run **Local Branch Manager: Show Local Branches** from the Command Palette. Delete buttons appear when you hover over branches that are not currently checked out.

## Run locally

1. Run `pnpm install`.
2. Open this folder in VS Code.
3. Press `F5` to launch an Extension Development Host.
4. Open a Git repository in that window, then expand **Source Control → Local Branches**.

## Build a VSIX

Run:

```sh
pnpm package
```

Then install the resulting `.vsix` using **Extensions: Install from VSIX...** in the Command Palette.

## Development checks

```sh
pnpm format:check
pnpm lint
pnpm check
```

Oxlint runs with type-aware rules enabled. The project compiler is TypeScript 7, while the workspace keeps the TypeScript 6 compatibility SDK used by VS Code's experimental TS 7 integration.

## License

Copyright © 2026 Raman Sinclair. Licensed under the GNU General Public License v3.0 only.
