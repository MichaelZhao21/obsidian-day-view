import { Plugin, TAbstractFile, TFile, debounce } from "obsidian";
import { dateOfDailyNote } from "./daily-note";
import { dayKey, isSameDay } from "./dates";
import { DEFAULT_SETTINGS, DayViewSettingTab, type DayViewSettings } from "./settings";
import { DayViewTimeline, VIEW_TYPE_DAY_VIEW } from "./view";

export default class DayViewPlugin extends Plugin {
	settings: DayViewSettings = { ...DEFAULT_SETTINGS };
	private todayKey = dayKey(new Date());

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(VIEW_TYPE_DAY_VIEW, (leaf) => new DayViewTimeline(leaf, this));
		this.addRibbonIcon("calendar-clock", "Open Day View", () => void this.activateView());
		this.addCommand({ id: "open", name: "Open timeline", callback: () => void this.activateView() });
		this.addCommand({
			id: "next-day",
			name: "Next day",
			callback: () => void this.withView((view) => view.shiftDay(1)),
		});
		this.addCommand({
			id: "previous-day",
			name: "Previous day",
			callback: () => void this.withView((view) => view.shiftDay(-1)),
		});
		this.addCommand({
			id: "today",
			name: "Go to today",
			callback: () => void this.withView((view) => view.goToDate(new Date())),
		});
		this.addSettingTab(new DayViewSettingTab(this.app, this));

		// Redraw any view whose note changed on disk. Rename passes the old path as a second argument.
		const onVaultChange = debounce(
			(file: TAbstractFile, oldPath?: string) => {
				for (const view of this.views()) {
					if (view.matchesPath(file.path) || (oldPath !== undefined && view.matchesPath(oldPath))) {
						void view.refresh();
					}
				}
			},
			250,
			true,
		);
		this.registerEvent(this.app.vault.on("modify", onVaultChange));
		this.registerEvent(this.app.vault.on("create", onVaultChange));
		this.registerEvent(this.app.vault.on("delete", onVaultChange));
		this.registerEvent(this.app.vault.on("rename", onVaultChange));

		// Opening a daily note moves any open timeline to that day. Never opens the timeline itself.
		this.registerEvent(
			this.app.workspace.on("file-open", (file: TFile | null) => {
				if (!file || !this.settings.followActiveNote) return;
				const date = dateOfDailyNote(this.settings, file.path);
				if (!date) return;
				for (const view of this.views()) {
					if (!isSameDay(view.selectedDate, date)) void view.goToDate(date);
				}
			}),
		);

		// Day rollover: views that were on today follow to the new day.
		this.registerInterval(
			window.setInterval(() => {
				const now = dayKey(new Date());
				if (now === this.todayKey) return;
				const previous = this.todayKey;
				this.todayKey = now;
				for (const view of this.views()) void view.handleDayRollover(previous);
			}, 60_000),
		);
	}

	async loadSettings(): Promise<void> {
		this.settings = { ...DEFAULT_SETTINGS, ...((await this.loadData()) as Partial<DayViewSettings> | null) };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		for (const view of this.views()) void view.refresh();
	}

	private views(): DayViewTimeline[] {
		return this.app.workspace
			.getLeavesOfType(VIEW_TYPE_DAY_VIEW)
			.map((leaf) => leaf.view)
			.filter((view): view is DayViewTimeline => view instanceof DayViewTimeline);
	}

	/** Runs an action against the open timeline, opening it first if needed. */
	private async withView(action: (view: DayViewTimeline) => Promise<void>): Promise<void> {
		const view = (await this.activateView()) ?? this.views()[0];
		if (view) await action(view);
	}

	private async activateView(): Promise<DayViewTimeline | null> {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_DAY_VIEW)[0];
		const leaf = existing ?? this.app.workspace.getRightLeaf(false);
		if (!leaf) return null;
		if (!existing) await leaf.setViewState({ type: VIEW_TYPE_DAY_VIEW, active: true });
		await this.app.workspace.revealLeaf(leaf);
		if (!(leaf.view instanceof DayViewTimeline)) return null;
		leaf.view.scrollIntoPlace();
		return leaf.view;
	}
}
