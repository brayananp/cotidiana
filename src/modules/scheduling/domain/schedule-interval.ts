import { InvalidScheduleIntervalError } from "./schedule-errors";

export type ScheduleInterval = {
	startAt: string;
	endAt: string;
};

export function assertValidScheduleInterval(interval: ScheduleInterval): void {
	const start = new Date(interval.startAt).getTime();
	const end = new Date(interval.endAt).getTime();

	if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
		throw new InvalidScheduleIntervalError();
	}
}

export function intervalsOverlap(
	left: ScheduleInterval,
	right: ScheduleInterval,
): boolean {
	assertValidScheduleInterval(left);
	assertValidScheduleInterval(right);

	return (
		new Date(left.startAt).getTime() < new Date(right.endAt).getTime() &&
		new Date(left.endAt).getTime() > new Date(right.startAt).getTime()
	);
}
