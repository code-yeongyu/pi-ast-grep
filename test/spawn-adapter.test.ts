import { spawn } from "node:child_process";

import { describe, expect, it } from "vitest";

import { collectProcessOutputWithTimeout } from "../src/ast-grep/process-timeout.js";

function spawnNode(script: string) {
	return spawn(process.execPath, ["-e", script], { stdio: ["ignore", "pipe", "pipe"] });
}

describe("collectProcessOutputWithTimeout", () => {
	it("#given successful process #when collecting output #then returns stdout stderr and zero exit", async () => {
		// given
		const processHandle = spawnNode("process.stdout.write('hello'); process.stderr.write('warn'); process.exit(0)");

		// when
		const output = await collectProcessOutputWithTimeout(processHandle, 5_000);

		// then
		expect(output).toEqual({ stdout: "hello", stderr: "warn", exitCode: 0 });
	}, 5_000);

	it("#given nonzero process #when collecting output #then returns nonzero exit code", async () => {
		// given
		const processHandle = spawnNode("process.stderr.write('boom'); process.exit(2)");

		// when
		const output = await collectProcessOutputWithTimeout(processHandle, 5_000);

		// then
		expect(output.stdout).toBe("");
		expect(output.stderr).toBe("boom");
		expect(output.exitCode).toBe(2);
	}, 5_000);

	it("#given hanging process #when timeout elapses #then throws timeout error", async () => {
		// given
		const processHandle = spawnNode("setInterval(() => {}, 1000)");

		// when / then
		await expect(collectProcessOutputWithTimeout(processHandle, 200)).rejects.toThrow(/timeout after 200ms/i);
	}, 5_000);

	it("#given empty stdout process #when collecting output #then returns empty stdout and zero exit", async () => {
		// given
		const processHandle = spawnNode("");

		// when
		const output = await collectProcessOutputWithTimeout(processHandle, 5_000);

		// then
		expect(output.stdout).toBe("");
		expect(output.stderr).toBe("");
		expect(output.exitCode).toBe(0);
	}, 5_000);
});
