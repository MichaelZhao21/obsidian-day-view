import { describe, expect, it } from "vitest";
import { layoutItems, type LaidOutItem } from "../src/layout";

interface Iv {
	id: string;
	startMin: number;
	endMin: number;
}
const iv = (id: string, startMin: number, endMin: number): Iv => ({ id, startMin, endMin });
const byId = (laid: LaidOutItem<Iv>[]): Record<string, [number, number]> =>
	Object.fromEntries(laid.map((l) => [l.item.id, [l.column, l.columnCount]]));

describe("layoutItems", () => {
	it("gives non-overlapping items a single full-width column", () => {
		expect(byId(layoutItems([iv("a", 0, 60), iv("b", 60, 120)]))).toEqual({ a: [0, 1], b: [0, 1] });
	});
	it("splits two overlapping items side by side", () => {
		expect(byId(layoutItems([iv("a", 0, 60), iv("b", 30, 90)]))).toEqual({ a: [0, 2], b: [1, 2] });
	});
	it("shares the column count across a transitive cluster", () => {
		// a overlaps b, b overlaps c, a does not overlap c: still one cluster of 2 columns.
		expect(byId(layoutItems([iv("a", 0, 60), iv("b", 30, 90), iv("c", 60, 120)]))).toEqual({
			a: [0, 2],
			b: [1, 2],
			c: [0, 2],
		});
	});
	it("uses three columns when three items overlap at once", () => {
		const laid = byId(layoutItems([iv("a", 0, 60), iv("b", 10, 60), iv("c", 20, 60)]));
		expect(Object.values(laid).map(([, n]) => n)).toEqual([3, 3, 3]);
		expect(new Set(Object.values(laid).map(([c]) => c)).size).toBe(3);
	});
	it("keeps separate clusters independent", () => {
		expect(byId(layoutItems([iv("a", 0, 60), iv("b", 30, 90), iv("c", 600, 660)]))).toEqual({
			a: [0, 2],
			b: [1, 2],
			c: [0, 1],
		});
	});
	it("does not mutate or reorder the input", () => {
		const input = [iv("b", 30, 90), iv("a", 0, 60)];
		layoutItems(input);
		expect(input.map((i) => i.id)).toEqual(["b", "a"]);
	});
	it("returns an empty array for no items", () => {
		expect(layoutItems([])).toEqual([]);
	});
});
