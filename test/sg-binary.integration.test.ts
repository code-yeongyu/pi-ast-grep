import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { findSgCliPathSync } from "../src/ast-grep/binary-path.js";
import { runSg } from "../src/ast-grep/cli.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_DIR = resolve(__dirname, "fixtures/sg-project");
const TS_FIXTURE = resolve(FIXTURE_DIR, "sample.ts");

const previousOffline = process.env["PI_OFFLINE"];

describe("sg binary integration", () => {
	beforeAll(() => {
		// given a hermetic offline-disabled environment so resolution can use
		// the locally-installed @ast-grep/cli package instead of GitHub
		delete process.env["PI_OFFLINE"];
	});

	afterAll(() => {
		if (previousOffline === undefined) {
			delete process.env["PI_OFFLINE"];
		} else {
			process.env["PI_OFFLINE"] = previousOffline;
		}
	});

	it("#given a resolvable sg binary #when checking #then it is present", () => {
		// when
		const path = findSgCliPathSync();

		// then
		expect(path, "sg binary must be resolvable for integration tests").not.toBeNull();
	});

	it("#given a typescript fixture with console.log #when ast_grep_search runs #then it returns a structural match", async () => {
		// given
		const path = findSgCliPathSync();
		if (!path) {
			expect.fail("sg binary unavailable; integration test cannot run");
		}

		// when
		const result = await runSg({
			pattern: "console.log($MSG)",
			lang: "typescript",
			paths: [TS_FIXTURE],
		});

		// then
		expect(result.error).toBeUndefined();
		expect(result.matches.length).toBeGreaterThanOrEqual(1);
		const firstMatch = result.matches[0];
		if (!firstMatch) {
			expect.fail("expected at least one match");
		}
		expect(firstMatch.file).toContain("sample.ts");
		expect(firstMatch.text).toContain("console.log");
		expect(typeof firstMatch.range.start.line).toBe("number");
		expect(typeof firstMatch.range.start.column).toBe("number");
	}, 15_000);

	it("#given a function pattern #when ast_grep_search runs #then it returns the structural match", async () => {
		// given
		const path = findSgCliPathSync();
		if (!path) {
			expect.fail("sg binary unavailable; integration test cannot run");
		}

		// when
		const result = await runSg({
			pattern: "function $NAME($$$) { $$$ }",
			lang: "typescript",
			paths: [TS_FIXTURE],
		});

		// then
		expect(result.error).toBeUndefined();
		expect(result.matches.length).toBeGreaterThanOrEqual(1);
	}, 15_000);

	it("#given a glob filter #when ast_grep_search runs #then it respects the glob", async () => {
		// given
		const path = findSgCliPathSync();
		if (!path) {
			expect.fail("sg binary unavailable; integration test cannot run");
		}

		// when
		const result = await runSg({
			pattern: "console.log($MSG)",
			lang: "typescript",
			paths: [FIXTURE_DIR],
			globs: ["*.ts"],
		});

		// then
		expect(result.error).toBeUndefined();
		expect(result.matches.length).toBeGreaterThanOrEqual(1);
		for (const match of result.matches) {
			expect(match.file.endsWith(".ts")).toBe(true);
		}
	}, 15_000);

	it("#given a no-match pattern #when ast_grep_search runs #then it returns empty matches without error", async () => {
		// given
		const path = findSgCliPathSync();
		if (!path) {
			expect.fail("sg binary unavailable; integration test cannot run");
		}

		// when
		const result = await runSg({
			pattern: "thisIdentifierDoesNotExistAnywhere($$$)",
			lang: "typescript",
			paths: [TS_FIXTURE],
		});

		// then
		expect(result.error).toBeUndefined();
		expect(result.matches).toHaveLength(0);
		expect(result.totalMatches).toBe(0);
	}, 15_000);

	it("#given a dry-run replace #when ast_grep_replace runs #then it returns matches but does not mutate the file", async () => {
		// given
		const path = findSgCliPathSync();
		if (!path) {
			expect.fail("sg binary unavailable; integration test cannot run");
		}
		const { readFileSync } = await import("node:fs");
		const before = readFileSync(TS_FIXTURE, "utf-8");

		// when
		const result = await runSg({
			pattern: "console.log($MSG)",
			rewrite: "logger.info($MSG)",
			lang: "typescript",
			paths: [TS_FIXTURE],
			updateAll: false,
		});

		// then
		expect(result.error).toBeUndefined();
		expect(result.matches.length).toBeGreaterThanOrEqual(1);
		const after = readFileSync(TS_FIXTURE, "utf-8");
		expect(after).toBe(before);
	}, 15_000);
});
