import { describe, expect, it } from "vitest";
import { relativeNoteName } from "../src/note-path";

describe("relativeNoteName", () => {
	it("strips the folder and extension", () => {
		expect(relativeNoteName("Daily/2026-09-21.md", "Daily")).toBe("2026-09-21");
	});
	it("keeps nested path segments produced by a format containing slashes", () => {
		expect(relativeNoteName("Daily/2026/09/2026-09-21.md", "Daily")).toBe("2026/09/2026-09-21");
	});
	it("handles a blank folder as the vault root", () => {
		expect(relativeNoteName("2026-09-21.md", "")).toBe("2026-09-21");
	});
	it("tolerates a trailing slash on the folder", () => {
		expect(relativeNoteName("Daily/2026-09-21.md", "Daily/")).toBe("2026-09-21");
	});
	it("rejects files outside the folder, non-markdown files, and near-miss folders", () => {
		expect(relativeNoteName("Other/2026-09-21.md", "Daily")).toBeNull();
		expect(relativeNoteName("Daily/2026-09-21.png", "Daily")).toBeNull();
		expect(relativeNoteName("DailyArchive/2026-09-21.md", "Daily")).toBeNull();
		expect(relativeNoteName("Daily/.md", "Daily")).toBeNull();
	});
});
