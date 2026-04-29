import { Type } from "typebox";
import { describe, expect, it } from "vitest";

import { ast_grep_replace, ast_grep_search } from "../src/ast-grep/tools.js";

describe("ast_grep_search tool definition", () => {
	it("#given search tool #when inspecting metadata #then exposes expected name label and description", () => {
		// given / when
		const tool = ast_grep_search;

		// then
		expect(tool.name).toBe("ast_grep_search");
		expect(tool.label).toBe("AST Grep Search");
		expect(tool.description).toContain("AST");
		expect(tool.description).toContain("$VAR");
		expect(tool.description).toContain("$$$");
	});

	it("#given search parameters #when inspecting schema #then requires pattern and lang only", () => {
		// given
		const objectSchema = Type.Object({});
		const parameters = ast_grep_search.parameters;

		// when / then
		expect(parameters.type).toBe(objectSchema.type);
		expect(parameters.required).toEqual(["pattern", "lang"]);
		expect(parameters.properties).toHaveProperty("pattern");
		expect(parameters.properties).toHaveProperty("lang");
		expect(parameters.properties).toHaveProperty("paths");
		expect(parameters.properties).toHaveProperty("globs");
		expect(parameters.required).not.toContain("paths");
		expect(parameters.required).not.toContain("globs");
	});
});

describe("ast_grep_replace tool definition", () => {
	it("#given replace tool #when inspecting metadata #then exposes expected name label and execution mode", () => {
		// given / when
		const tool = ast_grep_replace;

		// then
		expect(tool.name).toBe("ast_grep_replace");
		expect(tool.label).toBe("AST Grep Replace");
		expect(tool.executionMode).toBe("sequential");
	});

	it("#given replace parameters #when inspecting schema #then requires pattern rewrite and lang", () => {
		// given
		const objectSchema = Type.Object({});
		const parameters = ast_grep_replace.parameters;

		// when / then
		expect(parameters.type).toBe(objectSchema.type);
		expect(parameters.required).toEqual(["pattern", "rewrite", "lang"]);
		expect(parameters.properties).toHaveProperty("pattern");
		expect(parameters.properties).toHaveProperty("rewrite");
		expect(parameters.properties).toHaveProperty("lang");
		expect(parameters.properties).toHaveProperty("paths");
		expect(parameters.properties).toHaveProperty("globs");
		expect(parameters.properties).toHaveProperty("dryRun");
		expect(parameters.required).not.toContain("paths");
		expect(parameters.required).not.toContain("globs");
		expect(parameters.required).not.toContain("dryRun");
	});
});
