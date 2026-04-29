export function greet(name: string): string {
	console.log("greeting");
	return `hello, ${name}`;
}

console.log("top level");

function _helper() {
	return 42;
}
