import { App, TFile, moment, normalizePath } from "obsidian";
import { getDailyNoteSettings } from "obsidian-daily-notes-interface";
import type { DayViewSettings } from "./settings";

export interface DailyNoteLocation {
	folder: string;
	/** moment format string for the note name; may itself contain "/" for nested folders. */
	format: string;
}

export const DEFAULT_DAILY_NOTE_FORMAT = "YYYY-MM-DD";

/** The obsidian typings expose moment as a namespace, not a callable, so narrow it to what this plugin uses. */
export const formatDate = (date: Date, format: string): string =>
	(moment as unknown as (d: Date) => { format(f: string): string })(date).format(format);

/** Folder and format from the core Daily Notes plugin (or Periodic Notes when it owns daily notes). */
export function coreDailyNoteSettings(): DailyNoteLocation {
	// The library is typed as always returning an object but returns undefined when the core plugin is unavailable.
	const core = (getDailyNoteSettings() ?? {}) as { folder?: string; format?: string };
	return { folder: core.folder ?? "", format: core.format || DEFAULT_DAILY_NOTE_FORMAT };
}

/** Plugin settings override the core plugin only where they are non-blank. */
export function effectiveLocation(settings: DayViewSettings): DailyNoteLocation {
	const core = coreDailyNoteSettings();
	return {
		folder: settings.dailyNoteFolder || core.folder,
		format: settings.dailyNoteFormat || core.format,
	};
}

export function dailyNotePath(settings: DayViewSettings, date: Date): string {
	const { folder, format } = effectiveLocation(settings);
	const name = formatDate(date, format);
	return normalizePath(folder ? `${folder}/${name}.md` : `${name}.md`);
}

export interface ResolvedDailyNote {
	path: string;
	file: TFile | null;
}

export function resolveDailyNote(app: App, settings: DayViewSettings, date: Date): ResolvedDailyNote {
	const path = dailyNotePath(settings, date);
	const file = app.vault.getAbstractFileByPath(path);
	return { path, file: file instanceof TFile ? file : null };
}
