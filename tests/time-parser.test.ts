import { describe, expect, it } from "vitest";
import { DEFAULT_DURATION_MIN, parseNote, parseTaskLine, parseTimeRange } from "../src/time-parser";

const h = (hours: number, minutes = 0): number => hours * 60 + minutes;

describe("parseTimeRange: formats from the design", () => {
	it.each([
		["12pm", h(12), h(12) + DEFAULT_DURATION_MIN],
		["1:30pm", h(13, 30), h(13, 30) + DEFAULT_DURATION_MIN],
		["13:30", h(13, 30), h(13, 30) + DEFAULT_DURATION_MIN],
		["12pm-1pm", h(12), h(13)],
		["12:30pm-1:30pm", h(12, 30), h(13, 30)],
		["12pm-1:30pm", h(12), h(13, 30)],
		["12:30pm-1:00pm", h(12, 30), h(13)],
		["4-5pm", h(16), h(17)],
		["13:00-15:00", h(13), h(15)],
	])("%s", (text, startMin, endMin) => {
		expect(parseTimeRange(text)).toEqual({ startMin, endMin, rest: "" });
	});
});

describe("parseTimeRange: meridiem inheritance and edges", () => {
	it("12am is midnight and 12pm is noon", () => {
		expect(parseTimeRange("12am")?.startMin).toBe(0);
		expect(parseTimeRange("12pm")?.startMin).toBe(h(12));
	});
	it("end inherits the meridiem of the start", () => {
		expect(parseTimeRange("9am-10:30")).toMatchObject({ startMin: h(9), endMin: h(10, 30) });
	});
	it("an inherited end that lands before the start flips to the afternoon", () => {
		expect(parseTimeRange("11am-1")).toMatchObject({ startMin: h(11), endMin: h(13) });
	});
	it("ranges crossing midnight are clamped to end of day", () => {
		expect(parseTimeRange("11pm-1am")).toMatchObject({ startMin: h(23), endMin: h(24) });
		expect(parseTimeRange("10pm-1")).toMatchObject({ startMin: h(22), endMin: h(24) });
	});
	it("accepts en and em dashes and spaces around the dash", () => {
		expect(parseTimeRange("4 – 5pm")).toMatchObject({ startMin: h(16), endMin: h(17) });
		expect(parseTimeRange("4—5pm")).toMatchObject({ startMin: h(16), endMin: h(17) });
	});
	it("is case-insensitive", () => {
		expect(parseTimeRange("4PM")?.startMin).toBe(h(16));
	});
});

describe("parseTimeRange: rejects", () => {
	it.each([
		"4 things to do",
		"4-5 people coming",
		"12pmish",
		"13pm",
		"0pm",
		"25:00",
		"9:75",
		"13-5pm",
		"Standup at 9am",
		"",
	])("%j", (text) => {
		expect(parseTimeRange(text)).toBeNull();
	});
});

describe("parseTimeRange: title", () => {
	it("strips one leading separator", () => {
		expect(parseTimeRange("9am - Standup")?.rest).toBe("Standup");
		expect(parseTimeRange("9am: Standup")?.rest).toBe("Standup");
		expect(parseTimeRange("9am Standup")?.rest).toBe("Standup");
	});
	it("keeps dashes inside the title", () => {
		expect(parseTimeRange("9am Review - part 2")?.rest).toBe("Review - part 2");
	});
});

describe("parseTaskLine", () => {
	it("parses an open top-level checkbox", () => {
		expect(parseTaskLine("- [ ] 9am Standup", 3)).toEqual({
			title: "Standup",
			startMin: h(9),
			endMin: h(9, 30),
			done: false,
			lineNumber: 3,
		});
	});
	it("marks x, X and - as done", () => {
		expect(parseTaskLine("- [x] 9am a", 0)?.done).toBe(true);
		expect(parseTaskLine("- [X] 9am a", 0)?.done).toBe(true);
		expect(parseTaskLine("- [-] 9am a", 0)?.done).toBe(true);
	});
	it("accepts *, + and numbered list markers", () => {
		expect(parseTaskLine("* [ ] 9am a", 0)).not.toBeNull();
		expect(parseTaskLine("+ [ ] 9am a", 0)).not.toBeNull();
		expect(parseTaskLine("1. [ ] 9am a", 0)).not.toBeNull();
	});
	it("skips nested checkboxes", () => {
		expect(parseTaskLine("  - [ ] 9am nested", 0)).toBeNull();
		expect(parseTaskLine("\t- [ ] 9am nested", 0)).toBeNull();
	});
	it("skips non-checkbox lines and untimed checkboxes", () => {
		expect(parseTaskLine("- 9am plain bullet", 0)).toBeNull();
		expect(parseTaskLine("9am heading-ish line", 0)).toBeNull();
		expect(parseTaskLine("- [ ] Buy milk", 0)).toBeNull();
	});
	it("uses a placeholder when the title is empty", () => {
		expect(parseTaskLine("- [ ] 9am", 0)?.title).toBe("(untitled)");
	});
});

describe("parseNote", () => {
	it("returns items with their line numbers, handling CRLF", () => {
		const note = "# Today\r\n- [ ] 9am Standup\r\n  - [ ] 9:15am nested\r\n- [x] 13:00-15:00 Focus\r\n";
		expect(parseNote(note).map((i) => [i.lineNumber, i.title, i.done])).toEqual([
			[1, "Standup", false],
			[3, "Focus", true],
		]);
	});
});
