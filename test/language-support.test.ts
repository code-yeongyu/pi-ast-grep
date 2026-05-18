import { describe, expect, it } from "vitest";

import {
	CLI_LANGUAGES,
	DEFAULT_MAX_MATCHES,
	DEFAULT_MAX_OUTPUT_BYTES,
	DEFAULT_TIMEOUT_MS,
	LANG_EXTENSIONS,
} from "../src/ast-grep/languages.js";

describe("language support", () => {
	it("#given CLI languages #when counting #then includes the expected 25 languages", () => {
		// given / when / then
		expect(CLI_LANGUAGES.length).toBe(25);
	});

	it("#given CLI languages #when inspecting ordering #then matches omo source order", () => {
		// given
		const expectedLanguages = [
			"bash",
			"c",
			"cpp",
			"csharp",
			"css",
			"elixir",
			"go",
			"haskell",
			"html",
			"java",
			"javascript",
			"json",
			"kotlin",
			"lua",
			"nix",
			"php",
			"python",
			"ruby",
			"rust",
			"scala",
			"solidity",
			"swift",
			"typescript",
			"tsx",
			"yaml",
		] as const;

		// when / then
		expect(CLI_LANGUAGES).toEqual(expectedLanguages);
	});

	it("#given defaults #when inspecting limits #then matches expected timeout output and match caps", () => {
		// given / when / then
		expect(DEFAULT_TIMEOUT_MS).toBe(300_000);
		expect(DEFAULT_MAX_OUTPUT_BYTES).toBe(1 * 1024 * 1024);
		expect(DEFAULT_MAX_MATCHES).toBe(500);
	});

	it("#given language extensions #when inspecting python #then includes py and pyi", () => {
		// given / when
		const pythonExtensions = LANG_EXTENSIONS["python"];

		// then
		expect(pythonExtensions).toContain(".py");
		expect(pythonExtensions).toContain(".pyi");
	});
});
