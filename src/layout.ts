export interface Interval {
	startMin: number;
	endMin: number;
}

export interface LaidOutItem<T extends Interval> {
	item: T;
	/** Zero-based column within the overlap cluster. */
	column: number;
	/** Number of columns the cluster was split into. */
	columnCount: number;
}

/**
 * Calendar-style overlap layout. Items that transitively overlap form a cluster; each item takes the
 * first column in its cluster that is free at its start, and every item in the cluster shares the
 * cluster column count so widths line up.
 */
export function layoutItems<T extends Interval>(items: readonly T[]): LaidOutItem<T>[] {
	const sorted = [...items].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
	const out: LaidOutItem<T>[] = [];

	let cluster: T[] = [];
	let clusterEnd = -Infinity;

	const flush = (): void => {
		const columnEnds: number[] = [];
		const placed = cluster.map((item) => {
			let column = columnEnds.findIndex((end) => end <= item.startMin);
			if (column === -1) {
				column = columnEnds.length;
				columnEnds.push(item.endMin);
			} else {
				columnEnds[column] = item.endMin;
			}
			return { item, column };
		});
		for (const p of placed) out.push({ ...p, columnCount: columnEnds.length });
		cluster = [];
		clusterEnd = -Infinity;
	};

	for (const item of sorted) {
		if (cluster.length && item.startMin >= clusterEnd) flush();
		cluster.push(item);
		clusterEnd = Math.max(clusterEnd, item.endMin);
	}
	if (cluster.length) flush();
	return out;
}
