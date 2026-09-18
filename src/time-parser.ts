/** Default block length for an item that has a start time but no end time. */
export const DEFAULT_DURATION_MIN = 30;
export const MINUTES_PER_DAY = 24 * 60;

export interface TimelineItem {
	title: string;
	/** Minutes after local midnight. */
	startMin: number;
	/** Minutes after local midnight, always > startMin and <= MINUTES_PER_DAY. */
	endMin: number;
	done: boolean;
	/** Zero-based line index in the note. */
	lineNumber: number;
}

export interface TimeRange {
	startMin: number;
	endMin: number;
	/** Text following the time string, with one leading separator removed. */
	rest: string;
}

type Meridiem = "am" | "pm";

interface RawTime {
	hour: number;
	minute: number | null;
	meridiem: Meridiem | null;
}

// Top-level list item with a checkbox. Anchored at column 0, so nested items never match.
const CHECKBOX_RE = /^(?:[-*+]|\d+[.)])\s\[([ xX-])\]\s+(.*)$/;

// start[:mm][am|pm][ - end[:mm][am|pm]] followed by whitespace, a colon, or end of text.
const TIME_RE =
	/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?:\s*[-–—]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?(?=[\s:]|$)/i;

const LEADING_SEPARATOR_RE = /^\s*[:\-–—]?\s*/;

function toMeridiem(s: string | undefined): Meridiem | null {
	if (!s) return null;
	return s.toLowerCase() === "pm" ? "pm" : "am";
}

/**
 * Converts a raw time to minutes after midnight.
 * A time with am/pm needs hour 1-12. A time without am/pm is 24-hour and must carry minutes,
 * unless the other side of the range supplies an am/pm to inherit.
 */
function resolve(t: RawTime, inherited: Meridiem | null): number | null {
	const minute = t.minute ?? 0;
	if (minute > 59) return null;
	const meridiem = t.meridiem ?? inherited;
	if (meridiem) {
		if (t.hour < 1 || t.hour > 12) return null;
		return ((t.hour % 12) + (meridiem === "pm" ? 12 : 0)) * 60 + minute;
	}
	if (t.minute === null || t.hour > 23) return null;
	return t.hour * 60 + minute;
}

export function parseTimeRange(text: string): TimeRange | null {
	const m = TIME_RE.exec(text);
	if (!m) return null;

	const start: RawTime = {
		hour: Number(m[1]),
		minute: m[2] === undefined ? null : Number(m[2]),
		meridiem: toMeridiem(m[3]),
	};
	const end: RawTime | null =
		m[4] === undefined
			? null
			: {
					hour: Number(m[4]),
					minute: m[5] === undefined ? null : Number(m[5]),
					meridiem: toMeridiem(m[6]),
				};

	const startMin = resolve(start, end?.meridiem ?? null);
	if (startMin === null) return null;

	let endMin: number;
	if (end === null) {
		endMin = startMin + DEFAULT_DURATION_MIN;
	} else {
		const resolved = resolve(end, start.meridiem);
		if (resolved === null) return null;
		endMin = resolved;
		// "11am-1" means 1pm: an inherited meridiem that lands before the start flips to the afternoon.
		if (end.meridiem === null && start.meridiem !== null && endMin <= startMin) endMin += 12 * 60;
	}
	// Ranges that cross midnight are cut off at the end of the day.
	if (endMin <= startMin || endMin > MINUTES_PER_DAY) endMin = MINUTES_PER_DAY;

	const rest = text.slice(m[0].length).replace(LEADING_SEPARATOR_RE, "").trim();
	return { startMin, endMin, rest };
}

export function parseTaskLine(line: string, lineNumber: number): TimelineItem | null {
	const box = CHECKBOX_RE.exec(line);
	if (!box) return null;
	const range = parseTimeRange(box[2]);
	if (!range) return null;
	return {
		title: range.rest || "(untitled)",
		startMin: range.startMin,
		endMin: range.endMin,
		done: box[1] !== " ",
		lineNumber,
	};
}

export function parseNote(text: string): TimelineItem[] {
	const items: TimelineItem[] = [];
	text.split(/\r?\n/).forEach((line, i) => {
		const item = parseTaskLine(line, i);
		if (item) items.push(item);
	});
	return items;
}
