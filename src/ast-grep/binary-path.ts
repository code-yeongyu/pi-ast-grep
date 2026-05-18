import { existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { delimiter, dirname, join } from "node:path";

import { ensureAstGrepBinary, getCachedBinaryPath } from "./downloader.js";

type SupportedPlatform = "darwin" | "linux" | "win32";

const MIN_BINARY_SIZE_BYTES = 10_000;

function isValidBinary(filePath: string): boolean {
	try {
		return statSync(filePath).size > MIN_BINARY_SIZE_BYTES;
	} catch {
		return false;
	}
}

function getPlatformPackageName(): string | null {
	const platform = isSupportedPlatform(process.platform) ? process.platform : "unsupported";
	const arch = process.arch;

	const platformMap: Record<string, string> = {
		"darwin-arm64": "@ast-grep/cli-darwin-arm64",
		"darwin-x64": "@ast-grep/cli-darwin-x64",
		"linux-arm64": "@ast-grep/cli-linux-arm64-gnu",
		"linux-x64": "@ast-grep/cli-linux-x64-gnu",
		"win32-x64": "@ast-grep/cli-win32-x64-msvc",
		"win32-arm64": "@ast-grep/cli-win32-arm64-msvc",
		"win32-ia32": "@ast-grep/cli-win32-ia32-msvc",
	};

	return platformMap[`${platform}-${arch}`] ?? null;
}

function isSupportedPlatform(platform: NodeJS.Platform): platform is SupportedPlatform {
	return platform === "darwin" || platform === "linux" || platform === "win32";
}

function findOnPath(binaryName: string): string | null {
	const isWindows = process.platform === "win32";
	const pathEnv = process.env["PATH"] ?? (isWindows ? (process.env["Path"] ?? "") : "");
	if (!pathEnv) return null;

	const exts = isWindows ? ["", ".exe"] : [""];

	for (const dir of pathEnv.split(delimiter)) {
		for (const suffix of exts) {
			const candidate = join(dir, binaryName + suffix);
			if (existsSync(candidate) && isValidBinary(candidate)) {
				return candidate;
			}
		}
	}
	return null;
}

export function findSgCliPathSync(): string | null {
	const binaryName = process.platform === "win32" ? "sg.exe" : "sg";

	const cachedPath = getCachedBinaryPath();
	if (cachedPath && isValidBinary(cachedPath)) {
		return cachedPath;
	}

	try {
		const require = createRequire(import.meta.url);
		const cliPackageJsonPath = require.resolve("@ast-grep/cli/package.json");
		const cliDirectory = dirname(cliPackageJsonPath);
		const sgPath = join(cliDirectory, binaryName);

		if (existsSync(sgPath) && isValidBinary(sgPath)) {
			return sgPath;
		}
	} catch {}

	const platformPackage = getPlatformPackageName();
	if (platformPackage) {
		try {
			const require = createRequire(import.meta.url);
			const packageJsonPath = require.resolve(`${platformPackage}/package.json`);
			const packageDirectory = dirname(packageJsonPath);
			const astGrepBinaryName = process.platform === "win32" ? "ast-grep.exe" : "ast-grep";
			const binaryPath = join(packageDirectory, astGrepBinaryName);

			if (existsSync(binaryPath) && isValidBinary(binaryPath)) {
				return binaryPath;
			}
		} catch {}
	}

	const onPath = findOnPath(binaryName);
	if (onPath) return onPath;

	if (process.platform === "darwin") {
		for (const path of ["/opt/homebrew/bin/sg", "/usr/local/bin/sg"]) {
			if (existsSync(path) && isValidBinary(path)) {
				return path;
			}
		}
	}

	return null;
}

let resolvedCliPath: string | null = null;
let initPromise: Promise<string | null> | null = null;

export function getSgCliPath(): string | null {
	if (resolvedCliPath !== null && existsSync(resolvedCliPath)) {
		return resolvedCliPath;
	}
	const syncPath = findSgCliPathSync();
	if (syncPath) {
		resolvedCliPath = syncPath;
		return syncPath;
	}
	return null;
}

export function setSgCliPath(path: string): void {
	resolvedCliPath = path;
}

export async function getAstGrepPath(): Promise<string | null> {
	if (resolvedCliPath !== null && existsSync(resolvedCliPath)) {
		return resolvedCliPath;
	}

	if (initPromise) {
		return initPromise;
	}

	initPromise = (async () => {
		const syncPath = findSgCliPathSync();
		if (syncPath) {
			resolvedCliPath = syncPath;
			return syncPath;
		}

		const downloadedPath = await ensureAstGrepBinary();
		if (downloadedPath) {
			resolvedCliPath = downloadedPath;
			return downloadedPath;
		}

		return null;
	})();

	try {
		return await initPromise;
	} finally {
		initPromise = null;
	}
}

export function startBackgroundInit(): void {
	if (!initPromise) {
		const promise = getAstGrepPath();
		promise.catch(() => {});
	}
}

export function isCliAvailable(): boolean {
	const path = findSgCliPathSync();
	return path !== null && existsSync(path);
}

export async function ensureCliAvailable(): Promise<boolean> {
	const path = await getAstGrepPath();
	return path !== null && existsSync(path);
}

export function resetResolvedPathForTests(): void {
	resolvedCliPath = null;
	initPromise = null;
}
