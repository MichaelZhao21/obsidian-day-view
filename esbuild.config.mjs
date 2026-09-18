import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import { copyFileSync, mkdirSync } from "fs";
import { join } from "path";

const prod = process.argv[2] === "production";
const vaultPluginDir = join("test-vault", ".obsidian", "plugins", "day-view");

// After every build, mirror the release artifacts into the scratch vault.
const copyToTestVault = {
	name: "copy-to-test-vault",
	setup(build) {
		build.onEnd((result) => {
			if (result.errors.length) return;
			mkdirSync(vaultPluginDir, { recursive: true });
			for (const f of ["main.js", "manifest.json", "styles.css"]) {
				copyFileSync(f, join(vaultPluginDir, f));
			}
		});
	},
};

const context = await esbuild.context({
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtins,
	],
	format: "cjs",
	target: "es2018",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	outfile: "main.js",
	minify: prod,
	plugins: [copyToTestVault],
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
