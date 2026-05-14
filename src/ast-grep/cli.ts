import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

import { getAstGrepPath, getSgCliPath } from "./binary-path.js";
import { ensureAstGrepBinary } from "./downloader.js";
import { SearchTimeoutError } from "./errors.js";
import { createSgResultFromStdout } from "./json-output.js";
import { DEFAULT_TIMEOUT_MS } from "./languages.js";
import { collectProcessOutputWithTimeout } from "./process-timeout.js";
import type { RunSgOptions, SgResult } from "./types.js";

const INSTALL_HINT = [
	"ast-grep (sg) binary not found.",
	"",
	"Install options:",
	"  npm install -g @ast-grep/cli",
	"  cargo install ast-grep --locked",
	"  brew install ast-grep",
].join("\n");

const AUTO_DOWNLOAD_FAILED_HINT = [
	"ast-grep CLI binary not found.",
	"",
	"Auto-download failed. Manual install options:",
	"  npm install -g @ast-grep/cli",
	"  cargo install ast-grep --locked",
	"  brew install ast-grep",
].join("\n");

function isEnoentError(err: unknown): boolean {
	const errorCode = typeof err === "object" && err !== null && "code" in err ? err.code : undefined;
	const message = err instanceof Error ? err.message : String(err);
	return errorCode === "ENOENT" || message.includes("ENOENT") || message.includes("not found");
}

export function buildSgArgs(options: RunSgOptions, includeUpdateAll: boolean): string[] {
	const isWritePass = options.updateAll === true && !includeUpdateAll;
	const args = ["run", "-p", options.pattern, "--lang", options.lang];

	if (!isWritePass) {
		args.push("--json=compact");
	}

	if (options.rewrite) {
		args.push("-r", options.rewrite);
		if (includeUpdateAll) {
			args.push("--update-all");
		}
	}

	if (options.context && options.context > 0) {
		args.push("-C", String(options.context));
	}

	if (options.globs) {
		for (const glob of options.globs) {
			args.push("--globs", glob);
		}
	}

	const paths = options.paths && options.paths.length > 0 ? options.paths : ["."];
	args.push(...paths);

	return args;
}

async function spawnSg(cliPath: string, args: string[], timeoutMs: number) {
	const proc = spawn(cliPath, args, { stdio: ["ignore", "pipe", "pipe"] });
	return collectProcessOutputWithTimeout(proc, timeoutMs);
}

export async function runSg(options: RunSgOptions, hasRetriedDownload = false): Promise<SgResult> {
	const shouldSeparateWritePass = !!(options.rewrite && options.updateAll);

	const readOptions = shouldSeparateWritePass ? { ...options, updateAll: false } : options;
	const args = buildSgArgs(readOptions, !shouldSeparateWritePass);

	let cliPath = getSgCliPath();

	if (!cliPath || !existsSync(cliPath)) {
		const downloadedPath = await getAstGrepPath();
		if (downloadedPath && existsSync(downloadedPath)) {
			cliPath = downloadedPath;
		} else {
			return {
				matches: [],
				totalMatches: 0,
				truncated: false,
				error: INSTALL_HINT,
			};
		}
	}

	const timeout = DEFAULT_TIMEOUT_MS;

	let stdout: string;
	let stderr: string;
	let exitCode: number;

	try {
		const output = await spawnSg(cliPath, args, timeout);
		stdout = output.stdout;
		stderr = output.stderr;
		exitCode = output.exitCode;
	} catch (error) {
		if (error instanceof SearchTimeoutError) {
			return {
				matches: [],
				totalMatches: 0,
				truncated: true,
				truncatedReason: "timeout",
				error: error.message,
			};
		}

		if (isEnoentError(error)) {
			const downloadedPath = await ensureAstGrepBinary();
			if (downloadedPath && !hasRetriedDownload) {
				return runSg(options, true);
			}
			return {
				matches: [],
				totalMatches: 0,
				truncated: false,
				error: AUTO_DOWNLOAD_FAILED_HINT,
			};
		}

		const errorMessage = error instanceof Error ? error.message : String(error);
		return {
			matches: [],
			totalMatches: 0,
			truncated: false,
			error: `Failed to spawn ast-grep: ${errorMessage}`,
		};
	}

	if (exitCode !== 0 && stdout.trim() === "") {
		if (stderr.includes("No files found")) {
			return { matches: [], totalMatches: 0, truncated: false };
		}
		if (stderr.trim()) {
			return { matches: [], totalMatches: 0, truncated: false, error: stderr.trim() };
		}
		return { matches: [], totalMatches: 0, truncated: false };
	}

	const jsonResult = createSgResultFromStdout(stdout);

	if (shouldSeparateWritePass && jsonResult.matches.length > 0) {
		const writeArgs = buildSgArgs(options, false);
		writeArgs.push("--update-all");

		try {
			const writeOutput = await spawnSg(cliPath, writeArgs, timeout);
			if (writeOutput.exitCode !== 0) {
				const errorDetail = writeOutput.stderr.trim() || `ast-grep exited with code ${writeOutput.exitCode}`;
				return { ...jsonResult, error: `Replace failed: ${errorDetail}` };
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return { ...jsonResult, error: `Replace failed: ${errorMessage}` };
		}
	}

	return jsonResult;
}

export { INSTALL_HINT, AUTO_DOWNLOAD_FAILED_HINT };
