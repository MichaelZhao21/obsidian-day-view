import { App, PluginSettingTab, Setting } from "obsidian";
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

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const core = coreDailyNoteSettings();

		new Setting(containerEl)
			.setName("Daily note folder")
			.setDesc(`Leave blank to use the Daily Notes core plugin setting (currently "${core.folder || "vault root"}").`)
			.addText((text) =>
				text
					.setPlaceholder(core.folder || "vault root")
					.setValue(this.plugin.settings.dailyNoteFolder)
					.onChange(async (value) => {
						this.plugin.settings.dailyNoteFolder = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Daily note date format")
			.setDesc(`Moment format for the note name. Leave blank to use the Daily Notes core plugin setting (currently "${core.format}").`)
			.addText((text) =>
				text
					.setPlaceholder(core.format)
					.setValue(this.plugin.settings.dailyNoteFormat)
					.onChange(async (value) => {
						this.plugin.settings.dailyNoteFormat = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Follow the active daily note")
			.setDesc("When you open a daily note, an open timeline switches to that day.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.followActiveNote).onChange(async (value) => {
					this.plugin.settings.followActiveNote = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Hour height")
			.setDesc("Pixels per hour on the timeline.")
			.addSlider((slider) =>
				slider
					.setLimits(MIN_HOUR_HEIGHT, MAX_HOUR_HEIGHT, 10)
					.setValue(this.plugin.settings.hourHeight)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.hourHeight = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
