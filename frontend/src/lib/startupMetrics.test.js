import { beforeEach, describe, expect, it } from "vitest";
import {
	STARTUP_METRICS_KEY,
	clearStartupMetrics,
	getStartupMetricsSnapshot,
	markStartupMetric,
	measureStartupMetric,
} from "./startupMetrics";

describe("startupMetrics", () => {
	beforeEach(() => {
		clearStartupMetrics();
	});

	it("records development startup marks with timing and detail", () => {
		const mark = markStartupMetric("app-page:start", { route: "/app" });

		const snapshot = getStartupMetricsSnapshot();

		expect(mark).toEqual(
			expect.objectContaining({
				name: "app-page:start",
				detail: { route: "/app" },
			}),
		);
		expect(snapshot.marks).toHaveLength(1);
		expect(snapshot.marks[0].at).toEqual(expect.any(Number));
		expect(window[STARTUP_METRICS_KEY].marks).toHaveLength(1);
	});

	it("measures duration between two recorded marks", () => {
		markStartupMetric("background:catalog:start");
		markStartupMetric("background:catalog:end", { status: "success" });

		const measure = measureStartupMetric(
			"background:catalog",
			"background:catalog:start",
			"background:catalog:end",
		);

		expect(measure).toEqual(
			expect.objectContaining({
				name: "background:catalog",
				startMark: "background:catalog:start",
				endMark: "background:catalog:end",
			}),
		);
		expect(measure.duration).toBeGreaterThanOrEqual(0);
		expect(getStartupMetricsSnapshot().measures).toHaveLength(1);
	});
});
