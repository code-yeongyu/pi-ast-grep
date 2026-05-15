import type { ExtensionAPI, ToolDefinition } from "@earendil-works/pi-coding-agent";
import { createEventBus } from "@earendil-works/pi-coding-agent";
import type { TSchema } from "typebox";

export interface CapturedTool {
	definition: ToolDefinition<TSchema, unknown, never>;
}

export function createFakePi(): { pi: ExtensionAPI; tools: CapturedTool[] } {
	const tools: CapturedTool[] = [];

	const on: ExtensionAPI["on"] = () => {};
	const registerTool: ExtensionAPI["registerTool"] = (definition) => {
		const capturedDefinition = definition as ToolDefinition<TSchema, unknown, never>;
		tools.push({ definition: capturedDefinition });
	};
	const registerCommand: ExtensionAPI["registerCommand"] = () => {};
	const registerShortcut: ExtensionAPI["registerShortcut"] = () => {};
	const registerFlag: ExtensionAPI["registerFlag"] = () => {};
	const getFlag: ExtensionAPI["getFlag"] = () => undefined;
	const registerMessageRenderer: ExtensionAPI["registerMessageRenderer"] = () => {};
	const sendMessage: ExtensionAPI["sendMessage"] = () => {};
	const sendUserMessage: ExtensionAPI["sendUserMessage"] = () => {};
	const appendEntry: ExtensionAPI["appendEntry"] = () => {};
	const setSessionName: ExtensionAPI["setSessionName"] = () => {};
	const getSessionName: ExtensionAPI["getSessionName"] = () => undefined;
	const setLabel: ExtensionAPI["setLabel"] = () => {};
	const exec: ExtensionAPI["exec"] = async () => ({
		stdout: "",
		stderr: "",
		code: 0,
		killed: false,
	});
	const getActiveTools: ExtensionAPI["getActiveTools"] = () => tools.map((tool) => tool.definition.name);
	const getAllTools: ExtensionAPI["getAllTools"] = () => [];
	const setActiveTools: ExtensionAPI["setActiveTools"] = () => {};
	const getCommands: ExtensionAPI["getCommands"] = () => [];
	const setModel: ExtensionAPI["setModel"] = async () => true;
	const getThinkingLevel: ExtensionAPI["getThinkingLevel"] = () => "medium";
	const setThinkingLevel: ExtensionAPI["setThinkingLevel"] = () => {};
	const registerProvider: ExtensionAPI["registerProvider"] = () => {};
	const unregisterProvider: ExtensionAPI["unregisterProvider"] = () => {};

	const pi = {
		on,
		registerTool,
		registerCommand,
		registerShortcut,
		registerFlag,
		getFlag,
		registerMessageRenderer,
		sendMessage,
		sendUserMessage,
		appendEntry,
		setSessionName,
		getSessionName,
		setLabel,
		exec,
		getActiveTools,
		getAllTools,
		setActiveTools,
		getCommands,
		setModel,
		getThinkingLevel,
		setThinkingLevel,
		registerProvider,
		unregisterProvider,
		events: createEventBus(),
	} satisfies ExtensionAPI;

	return { pi, tools };
}
