import { changeTimeBlockStatusCommand } from "../application/commands/change-time-block-status";
import { createCalendarEventCommand } from "../application/commands/create-calendar-event";
import { createTimeBlockCommand } from "../application/commands/create-time-block";
import { deleteCalendarEventCommand } from "../application/commands/delete-calendar-event";
import { deleteTimeBlockCommand } from "../application/commands/delete-time-block";
import { updateCalendarEventCommand } from "../application/commands/update-calendar-event";
import { updateTimeBlockCommand } from "../application/commands/update-time-block";
import { listScheduleRangeQuery } from "../application/queries/list-schedule-range";
import { DexieSchedulingRepository } from "./local/dexie-scheduling.repository";
import { DexieSchedulingWriteStore } from "./local/dexie-scheduling-write-store";

const repository = new DexieSchedulingRepository();

const writeStore = new DexieSchedulingWriteStore();

export const schedulingDependencies = {
	repository,
	writeStore,

	createTimeBlock: createTimeBlockCommand(repository, writeStore),

	updateTimeBlock: updateTimeBlockCommand(repository, writeStore),

	changeTimeBlockStatus: changeTimeBlockStatusCommand(repository, writeStore),

	deleteTimeBlock: deleteTimeBlockCommand(repository, writeStore),

	createCalendarEvent: createCalendarEventCommand(repository, writeStore),

	updateCalendarEvent: updateCalendarEventCommand(repository, writeStore),

	deleteCalendarEvent: deleteCalendarEventCommand(repository, writeStore),

	listRange: listScheduleRangeQuery(repository),
};
