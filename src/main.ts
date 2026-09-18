import { Plugin, TAbstractFile, debounce } from "obsidian";
import { dailyNotePath, formatDate } from "./daily-note";
import { DEFAULT_SETTINGS, DayViewSettingTab, type DayViewSettings } from "./settings";
import { DayViewTimeline, VIEW_TYPE_DAY_VIEW } from "./view";

const DAY_KEY_FORMAT = "YYYY-MM-DD";

export default class DayViewPlugin extends Plugin {
	settings: DayViewSettings = { ...DEFAULT_SETTINGS };
	private lastRenderedDay = "";

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(VIEW_TYPE_DAY_VIEW, (leaf) => new DayViewTimeline(leaf, this));
		this.addRibbonIcon("calendar-clock", "Open Day View", () => void this.activateView());
		this.addCommand({
			id: "open",
			name: "Open timeline",
			callback: () => void this.activateView(),
		});
		this.addSettingTab(new DayViewSettingTab(this.app, this));

		// Redraw when the current daily note changes on disk. Rename passes the old path as a second argument.
		const onVaultChange = debounce(
			(file: TAbstractFile, oldPath?: string) => {
				const today = dailyNotePath(this.settings, new Date());
				if (file.path === today || oldPath === today) this.refreshViews();
			},
			250,
			true,
		);
		this.registerEvent(this.app.vault.on("modify", onVaultChange));
		this.registerEvent(this.app.vault.on("create", onVaultChange));
		this.registerEvent(this.app.vault.on("delete", onVaultChange));
		this.registerEvent(this.app.vault.on("rename", onVaultChange));

		// Day rollover: once the date changes, point the view at the new daily note.
		this.registerInterval(
			window.setInterval(() => {
				if (this.todayKey() !== this.lastRenderedDay) this.refreshViews();
			}, 60_000),
		);
	}

	async loadSettings(): Promise<void> {
		this.settings = { ...DEFAULT_SETTINGS, ...((await this.loadData()) as Partial<DayViewSettings> | null) };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.refreshViews();
	}

	refreshViews(): void {
		this.lastRenderedDay = this.todayKey();
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_DAY_VIEW)) {
			if (leaf.view instanceof DayViewTimeline) void leaf.view.refresh();
		}
	}

	private todayKey(): string {
		return formatDate(new Date(), DAY_KEY_FORMAT);
	}

	private async activateView(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_DAY_VIEW)[0];
		const leaf = existing ?? this.app.workspace.getRightLeaf(false);
		if (!leaf) return;
		if (!existing) await leaf.setViewState({ type: VIEW_TYPE_DAY_VIEW, active: true });
		await this.app.workspace.revealLeaf(leaf);
		if (leaf.view instanceof DayViewTimeline) leaf.view.scrollToNow();
	}
}
