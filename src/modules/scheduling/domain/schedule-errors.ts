export class ScheduleOverlapError extends Error {
	constructor() {
		super("SCHEDULE_OVERLAP");
		this.name = "ScheduleOverlapError";
	}
}

export class InvalidScheduleIntervalError extends Error {
	constructor() {
		super("INVALID_SCHEDULE_INTERVAL");
		this.name = "InvalidScheduleIntervalError";
	}
}
