import { chmodSync, createWriteStream, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import extractZip from "extract-zip";

export function getCachedBinaryPath(cacheDir: string, binaryName: string): string | null {
	const path = `${cacheDir}/${binaryName}`;
	return existsSync(path) ? path : null;
}

export function ensureCacheDir(cacheDir: string): void {
	if (!existsSync(cacheDir)) {
		mkdirSync(cacheDir, { recursive: true });
	}
}

export async function downloadArchive(downloadUrl: string, archivePath: string): Promise<void> {
	const response = await fetch(downloadUrl, { redirect: "follow" });
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}
	if (!response.body) {
		throw new Error("Empty response body");
	}

	const nodeStream = Readable.fromWeb(response.body as never);
	await pipeline(nodeStream, createWriteStream(archivePath));
}

export async function extractZipArchive(archivePath: string, destDir: string): Promise<void> {
	await extractZip(archivePath, { dir: resolve(destDir) });
}

export function cleanupArchive(archivePath: string): void {
	if (existsSync(archivePath)) {
		unlinkSync(archivePath);
	}
}

export function ensureExecutable(binaryPath: string): void {
	if (process.platform !== "win32" && existsSync(binaryPath)) {
		chmodSync(binaryPath, 0o755);
	}
}
