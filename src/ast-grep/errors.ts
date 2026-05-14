export class AstGrepDownloadError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AstGrepDownloadError";
	}
}

export class SearchTimeoutError extends Error {
	constructor(timeoutMs: number) {
		super(`Search timeout after ${timeoutMs}ms`);
		this.name = "SearchTimeoutError";
	}
}
