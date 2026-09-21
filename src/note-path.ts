/**
 * Strips the daily-note folder prefix and ".md" from a vault path, giving the part that the
 * date format produced. Returns null when the path is not a markdown file inside that folder.
 */
export function relativeNoteName(path: string, folder: string): string | null {
	if (!path.endsWith(".md")) return null;
	const prefix = folder ? `${folder.replace(/\/+$/, "")}/` : "";
	if (!path.startsWith(prefix)) return null;
	const name = path.slice(prefix.length, -".md".length);
	return name.length ? name : null;
}
