import type { ChildProcess } from "node:child_process";

import { SearchTimeoutError } from "./errors.js";

export interface ProcessOutput {
	stdout: string;
	stderr: string;
	exitCode: number;
}

export async function collectProcessOutputWithTimeout(proc: ChildProcess, timeoutMs: number): Promise<ProcessOutput> {
	let stdout = "";
	let stderr = "";

	proc.stdout?.setEncoding("utf-8");
	proc.stderr?.setEncoding("utf-8");

	proc.stdout?.on("data", (chunk: string) => {
		stdout += chunk;
	});
	proc.stderr?.on("data", (chunk: string) => {
		stderr += chunk;
	});

	let timeoutHandle: NodeJS.Timeout | null = null;

	const exitCode = await new Promise<number>((resolve, reject) => {
		const cleanup = () => {
			if (timeoutHandle !== null) {
				clearTimeout(timeoutHandle);
				timeoutHandle = null;
			}
		};

		timeoutHandle = setTimeout(() => {
			proc.kill("SIGTERM");
			setTimeout(() => {
				if (proc.exitCode === null && !proc.killed) {
					proc.kill("SIGKILL");
				}
			}, 1000);
			reject(new SearchTimeoutError(timeoutMs));
		}, timeoutMs);

		proc.once("close", (code) => {
			cleanup();
			resolve(code ?? 0);
		});

		proc.once("error", (err) => {
			cleanup();
			reject(err);
		});
	});

	return { stdout, stderr, exitCode };
}
