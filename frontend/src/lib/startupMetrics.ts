export const STARTUP_METRICS_KEY = "__GB_STARTUP_METRICS__";

function shouldCollectStartupMetrics() {
	return Boolean(import.meta.env.DEV && typeof window !== "undefined");
}

function now() {
	return performance?.now ? performance.now() : Date.now();
}

function getState() {
	if (!shouldCollectStartupMetrics()) return null;

	if (!window[STARTUP_METRICS_KEY]) {
		window[STARTUP_METRICS_KEY] = {
			version: 1,
			startedAt: performance?.timeOrigin || Date.now(),
			marks: [],
			measures: [],
		};
	}

	return window[STARTUP_METRICS_KEY];
}

function cloneEntry(entry) {
	return {
		...entry,
		detail: entry.detail ? { ...entry.detail } : {},
	};
}

export function markStartupMetric(name, detail = {}) {
	const state = getState();
	if (!state || !name) return null;

	const mark = {
		name,
		at: now(),
		detail: { ...detail },
	};
	state.marks.push(mark);

	try {
		performance.mark(`gb-startup:${name}`);
	} catch {
		// Some test/browser environments can reject duplicate or invalid marks.
	}

	return cloneEntry(mark);
}

export function measureStartupMetric(name, startMark, endMark, detail = {}) {
	const state = getState();
	if (!state || !name || !startMark || !endMark) return null;

	const start = [...state.marks]
		.reverse()
		.find((mark) => mark.name === startMark);
	const end = [...state.marks].reverse().find((mark) => mark.name === endMark);
	if (!start || !end) return null;

	const measure = {
		name,
		startMark,
		endMark,
		startAt: start.at,
		endAt: end.at,
		duration: Math.max(0, end.at - start.at),
		detail: { ...detail },
	};
	state.measures.push(measure);

	try {
		performance.measure(
			`gb-startup:${name}`,
			`gb-startup:${startMark}`,
			`gb-startup:${endMark}`,
		);
	} catch {
		// Browser performance entries are useful but not required for collection.
	}

	return cloneEntry(measure);
}

export function getStartupMetricsSnapshot() {
	const state = getState();
	if (!state) return { version: 1, startedAt: 0, marks: [], measures: [] };

	return {
		version: state.version,
		startedAt: state.startedAt,
		marks: state.marks.map(cloneEntry),
		measures: state.measures.map(cloneEntry),
	};
}

export function clearStartupMetrics() {
	if (typeof window !== "undefined") {
		delete window[STARTUP_METRICS_KEY];
	}
}
