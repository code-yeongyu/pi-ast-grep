import { describe, expect, it } from "vitest";

import { detectLanguageSpecificMistake, detectRegexMisuse, getPatternHint } from "../src/ast-grep/pattern-hints.js";

describe("detectRegexMisuse", () => {
	it("#given regex escape backslash w #when detecting misuse #then returns regex escapes hint", () => {
		// given
		const pattern = "\\w+Mode";

		// when
		const hint = detectRegexMisuse(pattern);

		// then
		expect(hint).toContain("regex escapes");
	});

	it("#given regex escape backslash d #when detecting misuse #then returns regex escapes hint", () => {
		// given
		const pattern = "id\\d+";

		// when
		const hint = detectRegexMisuse(pattern);

		// then
		expect(hint).toContain("regex escapes");
	});

	it("#given regex escape backslash s #when detecting misuse #then returns regex escapes hint", () => {
		// given
		const pattern = "name\\s+value";

		// when
		const hint = detectRegexMisuse(pattern);

		// then
		expect(hint).toContain("regex escapes");
	});

	it("#given regex escape backslash b #when detecting misuse #then returns regex escapes hint", () => {
		// given
		const pattern = "\\bword";

		// when
		const hint = detectRegexMisuse(pattern);

		// then
		expect(hint).toContain("regex escapes");
	});

	it("#given character class #when detecting misuse #then returns character classes hint", () => {
		// given
		const pattern = "[a-z]+Mode";

		// when
		const hint = detectRegexMisuse(pattern);

		// then
		expect(hint).toContain("character classes");
	});

	it("#given regex wildcard #when detecting misuse #then returns regex wildcards hint", () => {
		// given
		const pattern = "foo.*bar";

		// when
		const hint = detectRegexMisuse(pattern);

		// then
		expect(hint).toContain("regex wildcards");
	});

	it("#given regex alternation #when detecting misuse #then returns alternation hint", () => {
		// given
		const pattern = "foo|bar";

		// when
		const hint = detectRegexMisuse(pattern);

		// then
		expect(hint).toContain("alternation");
	});

	it("#given valid AST patterns #when detecting misuse #then returns null", () => {
		// given
		const patterns = ["function $NAME($$$) { $$$ }", "console.log($$$)", "$A | $B"];

		// when / then
		for (const pattern of patterns) {
			expect(detectRegexMisuse(pattern)).toBeNull();
		}
	});
});

describe("detectLanguageSpecificMistake", () => {
	it("#given python class with colon #when detecting mistake #then returns colon removal hint", () => {
		// given
		const pattern = "class Foo:";

		// when
		const hint = detectLanguageSpecificMistake(pattern, "python");

		// then
		expect(hint).toContain("Remove trailing colon");
		expect(hint).toContain("class Foo");
	});

	it("#given python def with colon #when detecting mistake #then returns colon removal hint", () => {
		// given
		const pattern = "def foo():";

		// when
		const hint = detectLanguageSpecificMistake(pattern, "python");

		// then
		expect(hint).toContain("Remove trailing colon");
		expect(hint).toContain("def foo()");
	});

	it("#given javascript function without body #when detecting mistake #then mentions params and body", () => {
		// given
		const pattern = "function $NAME";

		// when
		const hint = detectLanguageSpecificMistake(pattern, "javascript");

		// then
		expect(hint).toContain("params and body");
	});

	it("#given typescript function without body #when detecting mistake #then mentions params and body", () => {
		// given
		const pattern = "function $NAME";

		// when
		const hint = detectLanguageSpecificMistake(pattern, "typescript");

		// then
		expect(hint).toContain("params and body");
	});

	it("#given go function without body #when detecting mistake #then returns go function hint", () => {
		// given
		const pattern = "func $NAME";

		// when
		const hint = detectLanguageSpecificMistake(pattern, "go");

		// then
		expect(hint).toContain("func $NAME($$$) { $$$ }");
	});

	it("#given rust function without body #when detecting mistake #then returns rust function hint", () => {
		// given
		const pattern = "fn $NAME";

		// when
		const hint = detectLanguageSpecificMistake(pattern, "rust");

		// then
		expect(hint).toContain("fn $NAME($$$) { $$$ }");
	});

	it("#given valid AST patterns #when detecting language mistakes #then returns null", () => {
		// given
		const patterns = [
			{ pattern: "def $FUNC($$$)", language: "python" },
			{ pattern: "function $NAME($$$) { $$$ }", language: "typescript" },
			{ pattern: "func $NAME($$$) { $$$ }", language: "go" },
			{ pattern: "fn $NAME($$$) { $$$ }", language: "rust" },
		] as const;

		// when / then
		for (const { pattern, language } of patterns) {
			expect(detectLanguageSpecificMistake(pattern, language)).toBeNull();
		}
	});
});

describe("getPatternHint", () => {
	it("#given regex alternation #when composing hints #then regex hint wins over language check", () => {
		// given
		const pattern = "foo|bar";

		// when
		const hint = getPatternHint(pattern, "typescript");

		// then
		expect(hint).toContain("alternation");
	});

	it("#given python def with trailing colon #when composing hints #then returns colon hint", () => {
		// given
		const pattern = "def $FUNC($$$):";

		// when
		const hint = getPatternHint(pattern, "python");

		// then
		expect(hint).toContain("Remove trailing colon");
	});

	it("#given clean AST pattern #when composing hints #then returns null", () => {
		// given
		const pattern = "function $NAME($$$) { $$$ }";

		// when
		const hint = getPatternHint(pattern, "typescript");

		// then
		expect(hint).toBeNull();
	});
});
