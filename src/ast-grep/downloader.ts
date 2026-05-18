import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";

import {
	cleanupArchive,
	downloadArchive,
	ensureCacheDir,
	ensureExecutable,
	extractZipArchive,
	getCachedBinaryPath as getCachedBinaryPathShared,
} from "./binary-downloader.js";

const REPO = "ast-grep/ast-grep";
const CACHE_DIR_NAME = "pi-ast-grep";
const DEFAULT_VERSION = "0.41.1";

interface PlatformInfo {
	arch: string;
	os: string;
}

const PLATFORM_MAP: Record<string, PlatformInfo> = {
	"darwin-arm64": { arch: "aarch64", os: "apple-darwin" },
	"darwin-x64": { arch: "x86_64", os: "apple-darwin" },
	"linux-arm64": { arch: "aarch64", os: "unknown-linux-gnu" },
	"linux-x64": { arch: "x86_64", os: "unknown-linux-gnu" },
	"win32-x64": { arch: "x86_64", os: "pc-windows-msvc" },
	"win32-arm64": { arch: "aarch64", os: "pc-windows-msvc" },
	"win32-ia32": { arch: "i686", os: "pc-windows-msvc" },
};

function getAstGrepVersion(): string {
	try {
		const require = createRequire(import.meta.url);
		const pkg: unknown = require("@ast-grep/cli/package.json");
		return isPackageWithVersion(pkg) ? pkg.version : DEFAULT_VERSION;
	} catch {
		return DEFAULT_VERSION;
	}
}

function isPackageWithVersion(value: unknown): value is { version: string } {
	return typeof value === "object" && value !== null && "version" in value && typeof value.version === "string";
}

export function getCacheDir(): string {
	if (process.platform === "win32") {
		const localAppData = process.env["LOCALAPPDATA"] ?? process.env["APPDATA"];
		const base = localAppData ?? join(homedir(), "AppData", "Local");
		return join(base, CACHE_DIR_NAME, "bin");
	}

	const xdgCache = process.env["XDG_CACHE_HOME"];
	const base = xdgCache ?? join(homedir(), ".cache");
	return join(base, CACHE_DIR_NAME, "bin");
}

export function getBinaryName(): string {
	return process.platform === "win32" ? "sg.exe" : "sg";
}

export function getCachedBinaryPath(): string | null {
	return getCachedBinaryPathShared(getCacheDir(), getBinaryName());
}

export async function downloadAstGrep(version: string = DEFAULT_VERSION): Promise<string | null> {
	if (process.env["PI_OFFLINE"] === "1" || process.env["PI_OFFLINE"] === "true") {
		return null;
	}

	const platformKey = `${process.platform}-${process.arch}`;
	const platformInfo = PLATFORM_MAP[platformKey];

	if (!platformInfo) {
		return null;
	}

	const cacheDir = getCacheDir();
	const binaryName = getBinaryName();
	const binaryPath = join(cacheDir, binaryName);

	if (existsSync(binaryPath)) {
		return binaryPath;
	}

	const { arch, os } = platformInfo;
	const assetName = `app-${arch}-${os}.zip`;
	const downloadUrl = `https://github.com/${REPO}/releases/download/${version}/${assetName}`;

	try {
		const archivePath = join(cacheDir, assetName);
		ensureCacheDir(cacheDir);
		await downloadArchive(downloadUrl, archivePath);
		await extractZipArchive(archivePath, cacheDir);
		cleanupArchive(archivePath);
		ensureExecutable(binaryPath);

		return existsSync(binaryPath) ? binaryPath : null;
	} catch {
		return null;
	}
}

export async function ensureAstGrepBinary(): Promise<string | null> {
	if (process.env["PI_OFFLINE"] === "1" || process.env["PI_OFFLINE"] === "true") {
		return null;
	}

	const cachedPath = getCachedBinaryPath();
	if (cachedPath) {
		return cachedPath;
	}

	const version = getAstGrepVersion();
	return downloadAstGrep(version);
}

export { DEFAULT_VERSION as DEFAULT_AST_GREP_VERSION, PLATFORM_MAP };
