import { ItemView, WorkspaceLeaf } from "obsidian";
import { resolveDailyNote } from "./daily-note";
import { layoutItems } from "./layout";
import type DayViewPlugin from "./main";
import { MINUTES_PER_DAY, parseNote, type TimelineItem } from "./time-parser";

export const VIEW_TYPE_DAY_VIEW = "day-view-timeline";

/** Shortest block drawn, so a 5-minute item still has a visible title. */
const MIN_BLOCK_PX = 18;

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
		this.statusEl = root.createDiv({ cls: "dayview-status" });
		this.scrollEl = root.createDiv({ cls: "dayview-scroll" });
		this.canvasEl = this.scrollEl.createDiv({ cls: "dayview-canvas" });
		this.hoursEl = this.canvasEl.createDiv({ cls: "dayview-hours" });
		this.blocksEl = this.canvasEl.createDiv({ cls: "dayview-blocks" });
		this.nowLineEl = this.canvasEl.createDiv({ cls: "dayview-now" });

		this.registerInterval(window.setInterval(() => this.updateNowLine(), 60_000));

		await this.refresh();
		this.scrollToNow();
	}

	private get hourHeight(): number {
		return this.plugin.settings.hourHeight;
	}

	private minutesToPx(min: number): number {
		return (min / 60) * this.hourHeight;
	}

	/** Re-resolves the daily note, re-parses it, and redraws the whole column. */
	async refresh(): Promise<void> {
		this.canvasEl.style.height = `${this.minutesToPx(MINUTES_PER_DAY)}px`;
		this.renderHours();

		const { path, file } = resolveDailyNote(this.app, this.plugin.settings, new Date());
		if (!file) {
			this.setStatus(`No daily note at ${path}`);
			this.renderBlocks([]);
		} else {
			const items = parseNote(await this.app.vault.cachedRead(file));
			this.setStatus(items.length ? "" : `No timed tasks in ${file.basename}`);
			this.renderBlocks(items);
		}
		this.updateNowLine();
	}

	/** Scrolls so the current time sits in the vertical middle of the pane. */
	scrollToNow(): void {
		// Layout may not have run yet right after the view opens, so measure on the next frame.
		window.requestAnimationFrame(() => {
			const target = this.minutesToPx(minutesNow()) - this.scrollEl.clientHeight / 2;
			this.scrollEl.scrollTop = Math.max(0, target);
		});
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
		this.nowLineEl.style.top = `${this.minutesToPx(minutesNow())}px`;
	}
}
