import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import { formatDate, resolveDailyNote } from "./daily-note";
import { addDays, dayKey, isSameDay, startOfDay } from "./dates";
import { layoutItems } from "./layout";
import type DayViewPlugin from "./main";
import { MINUTES_PER_DAY, parseNote, type TimelineItem } from "./time-parser";

export const VIEW_TYPE_DAY_VIEW = "day-view-timeline";

/** Shortest block drawn, so a 5-minute item still has a visible title. */
const MIN_BLOCK_PX = 18;
/** Where an empty non-today schedule scrolls to. */
const DEFAULT_SCROLL_MIN = 8 * 60;

function hourLabel(hour: number): string {
	if (hour === 0) return "12am";
	if (hour < 12) return `${hour}am`;
	if (hour === 12) return "12pm";
	return `${hour - 12}pm`;
}

function clockLabel(totalMin: number): string {
	const clamped = Math.min(totalMin, MINUTES_PER_DAY);
	const hour24 = Math.floor(clamped / 60) % 24;
	const minute = clamped % 60;
	const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
	const suffix = hour24 < 12 ? "am" : "pm";
	return minute === 0 ? `${hour12}${suffix}` : `${hour12}:${String(minute).padStart(2, "0")}${suffix}`;
}

function minutesNow(): number {
	const now = new Date();
	return now.getHours() * 60 + now.getMinutes();
}

export class DayViewTimeline extends ItemView {
	private _selectedDate: Date = startOfDay(new Date());
	/** Vault path of the note the view currently shows, whether or not it exists. */
	private currentPath = "";
	private currentItems: TimelineItem[] = [];

	private dateLabelEl!: HTMLElement;
	private todayButtonEl!: HTMLButtonElement;
	private statusEl!: HTMLElement;
	private scrollEl!: HTMLElement;
	private canvasEl!: HTMLElement;
	private hoursEl!: HTMLElement;
	private blocksEl!: HTMLElement;
	private nowLineEl!: HTMLElement;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: DayViewPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_DAY_VIEW;
	}

	getDisplayText(): string {
		return "Day View";
	}

	getIcon(): string {
		return "calendar-clock";
	}

	async onOpen(): Promise<void> {
		const root = this.contentEl;
		root.empty();
		root.addClass("dayview");

		const toolbar = root.createDiv({ cls: "dayview-toolbar" });
		const prevEl = toolbar.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Previous day" } });
		setIcon(prevEl, "chevron-left");
		prevEl.addEventListener("click", () => void this.shiftDay(-1));
		this.dateLabelEl = toolbar.createDiv({ cls: "dayview-date" });
		const nextEl = toolbar.createEl("button", { cls: "clickable-icon", attr: { "aria-label": "Next day" } });
		setIcon(nextEl, "chevron-right");
		nextEl.addEventListener("click", () => void this.shiftDay(1));
		this.todayButtonEl = toolbar.createEl("button", { cls: "dayview-today", text: "Today" });
		this.todayButtonEl.addEventListener("click", () => void this.goToDate(new Date()));

		this.statusEl = root.createDiv({ cls: "dayview-status" });
		this.scrollEl = root.createDiv({ cls: "dayview-scroll" });
		this.canvasEl = this.scrollEl.createDiv({ cls: "dayview-canvas" });
		this.hoursEl = this.canvasEl.createDiv({ cls: "dayview-hours" });
		this.blocksEl = this.canvasEl.createDiv({ cls: "dayview-blocks" });
		this.nowLineEl = this.canvasEl.createDiv({ cls: "dayview-now" });

		this.registerInterval(window.setInterval(() => this.updateNowLine(), 60_000));

		await this.refresh();
		this.scrollIntoPlace();
	}

	get selectedDate(): Date {
		return this._selectedDate;
	}

	get isToday(): boolean {
		return isSameDay(this._selectedDate, new Date());
	}

	get selectedDayKey(): string {
		return dayKey(this._selectedDate);
	}

	/** True when a change to `path` affects what this view shows. */
	matchesPath(path: string): boolean {
		return path === this.currentPath;
	}

	async shiftDay(days: number): Promise<void> {
		await this.goToDate(addDays(this._selectedDate, days));
	}

	async goToDate(date: Date): Promise<void> {
		this._selectedDate = startOfDay(date);
		await this.refresh();
		this.scrollIntoPlace();
	}

	/** Called once a minute past midnight: a view that was on "today" follows to the new day. */
	async handleDayRollover(previousDayKey: string): Promise<void> {
		if (this.selectedDayKey === previousDayKey) await this.goToDate(new Date());
		else this.updateNowLine();
	}

	private get hourHeight(): number {
		return this.plugin.settings.hourHeight;
	}

	private minutesToPx(min: number): number {
		return (min / 60) * this.hourHeight;
	}

	/** Re-resolves the selected day's note, re-parses it, and redraws the whole column. */
	async refresh(): Promise<void> {
		this.canvasEl.style.height = `${this.minutesToPx(MINUTES_PER_DAY)}px`;
		this.renderHours();
		this.renderToolbar();

		const { path, file } = resolveDailyNote(this.app, this.plugin.settings, this._selectedDate);
		this.currentPath = path;
		if (!file) {
			this.setStatus(`No daily note at ${path}`);
			this.currentItems = [];
		} else {
			this.currentItems = parseNote(await this.app.vault.cachedRead(file));
			this.setStatus(this.currentItems.length ? "" : `No timed tasks in ${file.basename}`);
		}
		this.renderBlocks(this.currentItems);
		this.updateNowLine();
	}

	/** Centers the current time on today; otherwise the first item, or a default morning hour. */
	scrollIntoPlace(): void {
		let targetMin: number;
		if (this.isToday) targetMin = minutesNow();
		else if (this.currentItems.length) targetMin = Math.min(...this.currentItems.map((i) => i.startMin));
		else targetMin = DEFAULT_SCROLL_MIN;
		this.scrollToMinute(targetMin);
	}

	private scrollToMinute(min: number): void {
		// Layout may not have run yet right after the view opens, so measure on the next frame.
		window.requestAnimationFrame(() => {
			const target = this.minutesToPx(min) - this.scrollEl.clientHeight / 2;
			this.scrollEl.scrollTop = Math.max(0, target);
		});
	}

	private renderToolbar(): void {
		this.dateLabelEl.setText(formatDate(this._selectedDate, "ddd, MMM D"));
		this.dateLabelEl.setAttribute("aria-label", formatDate(this._selectedDate, "dddd, MMMM D, YYYY"));
		this.dateLabelEl.toggleClass("is-today", this.isToday);
		this.todayButtonEl.disabled = this.isToday;
	}

	private setStatus(text: string): void {
		this.statusEl.setText(text);
		this.statusEl.toggleClass("is-hidden", text === "");
	}

	private renderHours(): void {
		this.hoursEl.empty();
		for (let hour = 0; hour < 24; hour++) {
			const row = this.hoursEl.createDiv({ cls: "dayview-hour" });
			row.style.top = `${this.minutesToPx(hour * 60)}px`;
			row.style.height = `${this.hourHeight}px`;
			row.createSpan({ cls: "dayview-hour-label", text: hourLabel(hour) });
		}
	}

	private renderBlocks(items: TimelineItem[]): void {
		this.blocksEl.empty();
		for (const { item, column, columnCount } of layoutItems(items)) {
			const el = this.blocksEl.createDiv({ cls: "dayview-block" });
			if (item.done) el.addClass("is-done");
			const widthPct = 100 / columnCount;
			el.style.top = `${this.minutesToPx(item.startMin)}px`;
			el.style.height = `${Math.max(this.minutesToPx(item.endMin - item.startMin), MIN_BLOCK_PX)}px`;
			el.style.left = `${column * widthPct}%`;
			el.style.width = `${widthPct}%`;
			const timeText = `${clockLabel(item.startMin)}–${clockLabel(item.endMin)}`;
			el.createDiv({ cls: "dayview-block-time", text: timeText });
			el.createDiv({ cls: "dayview-block-title", text: item.title });
			el.setAttribute("aria-label", `${timeText} ${item.title}`);
		}
	}

	private updateNowLine(): void {
		this.nowLineEl.toggleClass("is-hidden", !this.isToday);
		this.nowLineEl.style.top = `${this.minutesToPx(minutesNow())}px`;
	}
}
