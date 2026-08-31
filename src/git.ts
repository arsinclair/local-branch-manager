import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GitBranch {
    readonly name: string;
    readonly current: boolean;
    readonly merged: boolean;
}

export interface GitRepository {
    readonly root: string;
    readonly branches: readonly GitBranch[];
}

async function runGit(cwd: string, args: readonly string[]): Promise<string> {
    const { stdout } = await execFileAsync("git", ["-C", cwd, ...args], {
        encoding: "utf8",
        maxBuffer: 4 * 1024 * 1024,
        windowsHide: true
    });

    return stdout.trimEnd();
}

async function findBranchesWithUniquePatches(
    repository: string,
    branches: readonly string[]
): Promise<ReadonlySet<string>> {
    const queue = [...branches];
    const branchesWithUniquePatches = new Set<string>();
    const workerCount = Math.min(8, queue.length);

    async function checkBranches(): Promise<void> {
        let branch: string | undefined;
        while ((branch = queue.pop()) !== undefined) {
            try {
                const output = await runGit(repository, ["cherry", "HEAD", branch]);
                if (output.split("\n").some((line) => line.startsWith("+ "))) {
                    branchesWithUniquePatches.add(branch);
                }
            } catch {
                // Be conservative when patch equivalence cannot be determined.
                branchesWithUniquePatches.add(branch);
            }
        }
    }

    await Promise.all(Array.from({ length: workerCount }, () => checkBranches()));
    return branchesWithUniquePatches;
}

export async function findRepository(folder: string): Promise<string | undefined> {
    try {
        return await runGit(folder, ["rev-parse", "--show-toplevel"]);
    } catch {
        return undefined;
    }
}

export async function getLocalBranches(repository: string): Promise<readonly GitBranch[]> {
    const output = await runGit(repository, [
        "for-each-ref",
        "--format=%(refname:short)%00%(HEAD)",
        "refs/heads/"
    ]);

    if (!output) {
        return [];
    }

    const unmergedOutput = await runGit(repository, [
        "for-each-ref",
        "--no-merged=HEAD",
        "--format=%(refname:short)",
        "refs/heads/"
    ]);
    const ancestryUnmergedBranches = unmergedOutput ? unmergedOutput.split("\n") : [];
    const branchesWithUniquePatches = await findBranchesWithUniquePatches(
        repository,
        ancestryUnmergedBranches
    );

    return output
        .split("\n")
        .map((line) => {
            const [name, headMarker] = line.split("\0");
            return {
                name,
                current: headMarker === "*",
                merged: !branchesWithUniquePatches.has(name)
            };
        })
        .sort((left, right) => {
            if (left.current !== right.current) {
                return left.current ? -1 : 1;
            }
            return left.name.localeCompare(right.name);
        });
}

export async function deleteLocalBranch(
    repository: string,
    branch: string,
    force = false
): Promise<void> {
    await runGit(repository, ["branch", force ? "-D" : "-d", "--", branch]);
}

export function getGitErrorMessage(error: unknown): string {
    if (typeof error === "object" && error !== null) {
        const candidate = error as { stderr?: unknown; message?: unknown };
        if (typeof candidate.stderr === "string" && candidate.stderr.trim()) {
            return candidate.stderr.trim();
        }
        if (typeof candidate.message === "string" && candidate.message.trim()) {
            return candidate.message.trim();
        }
    }

    return String(error);
}

export function isUnmergedBranchError(error: unknown): boolean {
    const message = getGitErrorMessage(error).toLowerCase();
    return message.includes("not fully merged") || message.includes("not yet merged");
}
