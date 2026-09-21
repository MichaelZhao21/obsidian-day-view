import { describe, expect, it } from "vitest";
import { addDays, dayKey, isSameDay, startOfDay } from "../src/dates";

describe("dates", () => {
	it("dayKey zero-pads month and day", () => {
		expect(dayKey(new Date(2026, 0, 5, 13, 45))).toBe("2026-01-05");
	});
	it("startOfDay drops the time but keeps the local date", () => {
		const d = startOfDay(new Date(2026, 8, 21, 23, 59, 59));
		expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0]);
		expect(dayKey(d)).toBe("2026-09-21");
	});
	it("addDays rolls across month and year boundaries", () => {
		expect(dayKey(addDays(new Date(2026, 8, 30), 1))).toBe("2026-10-01");
		expect(dayKey(addDays(new Date(2026, 0, 1), -1))).toBe("2025-12-31");
		expect(dayKey(addDays(new Date(2024, 1, 28), 1))).toBe("2024-02-29");
	});
	it("addDays does not mutate its input", () => {
		const d = new Date(2026, 8, 21);
		addDays(d, 5);
		expect(dayKey(d)).toBe("2026-09-21");
	});
	it("isSameDay ignores the time of day", () => {
		expect(isSameDay(new Date(2026, 8, 21, 1), new Date(2026, 8, 21, 23))).toBe(true);
		expect(isSameDay(new Date(2026, 8, 21, 23), new Date(2026, 8, 22, 0))).toBe(false);
	});
});
