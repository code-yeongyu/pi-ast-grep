import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";

function findOnPath(binaryName: string): string | null {
	const isWindows = process.platform === "win32";
	const pathEnv = process.env.PATH ?? (isWindows ? (process.env.Path ?? "") : "");
	if (!pathEnv) return null;

	const extensions = isWindows ? ["", ".exe", ".cmd", ".bat"] : [""];

	for (const dir of pathEnv.split(delimiter)) {
		for (const extension of extensions) {
			const candidate = join(dir, binaryName + extension);
			if (existsSync(candidate)) {
				return candidate;
			}
		}
	}

	return null;
}

let resolvedCliPath: string | null = null;

export function findSgCliPathSync(): string | null {
	return findOnPath("sg");
}

export function getSgCliPath(): string | null {
	if (resolvedCliPath !== null && existsSync(resolvedCliPath)) {
		return resolvedCliPath;
	}

	const syncPath = findSgCliPathSync();
	if (syncPath) {
		resolvedCliPath = "sg";
		return resolvedCliPath;
	}

	return null;
}

export function setSgCliPath(path: string): void {
	resolvedCliPath = path;
}

export function startBackgroundInit(): void {}

export function isCliAvailable(): boolean {
	return findSgCliPathSync() !== null;
}

export async function ensureCliAvailable(): Promise<boolean> {
	return isCliAvailable();
}

export function resetResolvedPathForTests(): void {
	resolvedCliPath = null;
}
