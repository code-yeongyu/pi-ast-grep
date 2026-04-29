import { describe, it } from "vitest";

describe.skip("archive validator", () => {
	it("#given archive extraction uses unzip #when validator module exists #then add explicit zip slip tests", () => {
		// Archive validation is currently bundled into extractZipArchive via unzip's built-in safety.
		// TODO: migrate to extract-zip with explicit zip-slip tests once a dedicated validator exists.
	});
});
