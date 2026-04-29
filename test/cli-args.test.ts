import { describe, expect, it } from "vitest";

import { buildSgArgs } from "../src/ast-grep/cli.js";
import type { RunSgOptions } from "../src/ast-grep/types.js";

const pattern = "console.log($MSG)";
const rewrite = "logger.info($MSG)";

describe("buildSgArgs", () => {
	it("#given search options #when building args #then returns compact JSON search argv", () => {
		// TODO: export buildSgArgs from src/ast-grep/cli.ts so this red test can run.
		// given
		const options: RunSgOptions = { pattern, lang: "typescript", paths: ["src"] };

		// when
		const args = buildSgArgs(options, false);

		// then
		expect(args).toEqual(["run", "-p", pattern, "--lang", "typescript", "--json=compact", "src"]);
	});

	it("#given context option #when building args #then inserts context before paths", () => {
		// TODO: export buildSgArgs from src/ast-grep/cli.ts so this red test can run.
		// given
		const options: RunSgOptions = { pattern, lang: "typescript", context: 3, paths: ["src"] };

		// when
		const args = buildSgArgs(options, false);

		// then
		expect(args).toEqual(["run", "-p", pattern, "--lang", "typescript", "--json=compact", "-C", "3", "src"]);
	});

	it("#given rewrite dry pass #when building args #then includes rewrite without update all", () => {
		// TODO: export buildSgArgs from src/ast-grep/cli.ts so this red test can run.
		// given
		const options: RunSgOptions = { pattern, rewrite, lang: "typescript", paths: ["src"] };

		// when
		const args = buildSgArgs(options, false);

		// then
		expect(args).toEqual(["run", "-p", pattern, "--lang", "typescript", "--json=compact", "-r", rewrite, "src"]);
		expect(args).not.toContain("--update-all");
	});

	it("#given rewrite update pass #when building args #then includes update all", () => {
		// TODO: export buildSgArgs from src/ast-grep/cli.ts so this red test can run.
		// given
		const options: RunSgOptions = { pattern, rewrite, lang: "typescript", paths: ["src"] };

		// when
		const args = buildSgArgs(options, true);

		// then
		expect(args).toEqual([
			"run",
			"-p",
			pattern,
			"--lang",
			"typescript",
			"--json=compact",
			"-r",
			rewrite,
			"--update-all",
			"src",
		]);
	});

	it("#given globs #when building args #then repeats globs flags", () => {
		// TODO: export buildSgArgs from src/ast-grep/cli.ts so this red test can run.
		// given
		const options: RunSgOptions = {
			pattern,
			lang: "typescript",
			globs: ["**/*.ts", "!**/*.test.ts"],
			paths: ["src"],
		};

		// when
		const args = buildSgArgs(options, false);

		// then
		expect(args).toEqual([
			"run",
			"-p",
			pattern,
			"--lang",
			"typescript",
			"--json=compact",
			"--globs",
			"**/*.ts",
			"--globs",
			"!**/*.test.ts",
			"src",
		]);
	});

	it("#given undefined paths #when building args #then defaults to current directory", () => {
		// TODO: export buildSgArgs from src/ast-grep/cli.ts so this red test can run.
		// given
		const options: RunSgOptions = { pattern, lang: "typescript" };

		// when
		const args = buildSgArgs(options, false);

		// then
		expect(args.at(-1)).toBe(".");
	});

	it("#given empty paths #when building args #then defaults to current directory", () => {
		// TODO: export buildSgArgs from src/ast-grep/cli.ts so this red test can run.
		// given
		const options: RunSgOptions = { pattern, lang: "typescript", paths: [] };

		// when
		const args = buildSgArgs(options, false);

		// then
		expect(args.at(-1)).toBe(".");
	});

	it("#given write pass options #when building args #then omits compact JSON flag", () => {
		// TODO: once buildSgArgs is exported, make write-pass argv omit --json=compact directly.
		// given
		const options: RunSgOptions = {
			pattern,
			rewrite,
			lang: "typescript",
			paths: ["src"],
			updateAll: true,
		};

		// when
		const args = buildSgArgs(options, false);

		// then
		expect(args).toEqual(["run", "-p", pattern, "--lang", "typescript", "-r", rewrite, "src"]);
		expect(args).not.toContain("--json=compact");
	});
});
