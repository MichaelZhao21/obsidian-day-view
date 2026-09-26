import { App, PluginSettingTab, type SettingDefinition } from "obsidian";
import { coreDailyNoteSettings } from "./daily-note";
import type DayViewPlugin from "./main";

export interface DayViewSettings {
	/** Blank means "use the core Daily Notes folder". */
	dailyNoteFolder: string;
	/** Blank means "use the core Daily Notes date format". */
	dailyNoteFormat: string;
	/** Pixels per hour on the timeline. */
	hourHeight: number;
	/** When a daily note becomes the active file, switch an open timeline to that day. */
	followActiveNote: boolean;
}

export const DEFAULT_SETTINGS: DayViewSettings = {
	dailyNoteFolder: "",
	dailyNoteFormat: "",
	hourHeight: 80,
	followActiveNote: true,
};

export const MIN_HOUR_HEIGHT = 20;
export const MAX_HOUR_HEIGHT = 200;

export class DayViewSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: DayViewPlugin,
	) {
		super(app, plugin);
	}

	// dailyNoteFolder / dailyNoteFormat are stored trimmed; handle here
	async setControlValue(key: string, value: unknown): Promise<void> {
		if (key === "dailyNoteFolder" || key === "dailyNoteFormat") {
			(this.plugin.settings[key] as string) = typeof value === "string" ? value.trim() : "";
		} else {
			(this.plugin.settings as unknown as Record<string, unknown>)[key] = value;
		}
		await this.plugin.saveSettings();
	}

	getSettingDefinitions(): SettingDefinition[] {
		// Recomputed on every call (tab open, update(), search indexing), so
		// the placeholders/descriptions always reflect the current core setting.
		const core = coreDailyNoteSettings();

		return [
			{
				name: "Daily note folder",
				desc: `Leave blank to use the Daily Notes core plugin setting (currently "${core.folder || "vault root"}").`,
				control: {
					type: "text",
					key: "dailyNoteFolder",
					placeholder: core.folder || "vault root",
				},
			},
			{
				name: "Daily note date format",
				desc: `Moment format for the note name. Leave blank to use the Daily Notes core plugin setting (currently "${core.format}").`,
				control: {
					type: "text",
					key: "dailyNoteFormat",
					placeholder: core.format,
				},
			},
			{
				name: "Follow the active daily note",
				desc: "When you open a daily note, an open timeline switches to that day.",
				control: {
					type: "toggle",
					key: "followActiveNote",
				},
			},
			{
				name: "Hour height",
				desc: "Pixels per hour on the timeline.",
				control: {
					type: "slider",
					key: "hourHeight",
					min: MIN_HOUR_HEIGHT,
					max: MAX_HOUR_HEIGHT,
					step: 10,
				},
			},
		];
	}
}