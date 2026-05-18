import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_AST_GREP_VERSION, getBinaryName, getCacheDir, PLATFORM_MAP } from "../src/ast-grep/downloader.js";

const originalXdgCacheHome = process.env["XDG_CACHE_HOME"];

describe("downloader helpers", () => {
	beforeEach(() => {
		process.env["XDG_CACHE_HOME"] = "/tmp/pi-ast-grep-cache-test";
	});

	afterEach(() => {
		if (originalXdgCacheHome === undefined) {
			delete process.env["XDG_CACHE_HOME"];
			return;
		}

		process.env["XDG_CACHE_HOME"] = originalXdgCacheHome;
	});

	it("#given cache environment override #when building cache dir #then returns pi ast grep cache path", () => {
		// given / when
		const cacheDirectory = getCacheDir();

		// then
		expect(cacheDirectory).toContain("pi-ast-grep");
		if (process.platform !== "win32") {
			expect(cacheDirectory).toBe(join("/tmp/pi-ast-grep-cache-test", "pi-ast-grep", "bin"));
		}
	});

	it("#given current platform #when resolving binary name #then returns platform specific sg name", () => {
		// given
		const expectedBinaryName = process.platform === "win32" ? "sg.exe" : "sg";

		// when / then
		expect(getBinaryName()).toBe(expectedBinaryName);
	});

	it("#given platform map #when inspecting keys #then contains supported platform entries", () => {
		// given
		const expectedKeys = [
			"darwin-arm64",
			"darwin-x64",
			"linux-arm64",
			"linux-x64",
			"win32-x64",
			"win32-arm64",
			"win32-ia32",
		];

		// when
		const keys = Object.keys(PLATFORM_MAP);

		// then
		expect(keys).toHaveLength(7);
		expect([...keys].sort()).toEqual([...expectedKeys].sort());
	});

	it("#given default version #when inspecting downloader constant #then matches ast grep cli version", () => {
		// given / when / then
		expect(DEFAULT_AST_GREP_VERSION).toBe("0.41.1");
	});
});
