import { getLocalDatabase } from "@/platform/database/local-database";
import type {
	ExcludedScheduleEntity,
	SchedulingRepository,
} from "../../domain/repositories/scheduling.repository";
import type {
	ScheduleEntry,
	ScheduleRangeQuery,
} from "../../domain/schedule-entry";
import {
	intervalsOverlap,
	type ScheduleInterval,
} from "../../domain/schedule-interval";
import { timeBlockBlocksSchedule } from "../../domain/time-block";
import {
	calendarEventFromRecord,
	timeBlockFromRecord,
} from "./scheduling.mapper";

export class DexieSchedulingRepository implements SchedulingRepository {
	async findTimeBlockById(id: string) {
		const record = await getLocalDatabase().timeBlocks.get(id);

		return record ? timeBlockFromRecord(record) : null;
	}

	async findCalendarEventById(id: string) {
		const record = await getLocalDatabase().calendarEvents.get(id);

		return record ? calendarEventFromRecord(record) : null;
	}

	async listRange(query: ScheduleRangeQuery): Promise<ScheduleEntry[]> {
		const db = getLocalDatabase();

		const [blocks, events] = await Promise.all([
			db.timeBlocks.where("userId").equals(query.userId).toArray(),

			db.calendarEvents.where("userId").equals(query.userId).toArray(),
		]);

		const range: ScheduleInterval = {
			startAt: query.rangeStart,
			endAt: query.rangeEnd,
		};

		const entries: ScheduleEntry[] = [];

		for (const record of blocks) {
			const block = timeBlockFromRecord(record);

			if (!query.includeDeleted && block.deletedAt) {
				continue;
			}

			if (intervalsOverlap(block, range)) {
				entries.push({
					entityType: "time_block",
					item: block,
				});
			}
		}

		for (const record of events) {
			const event = calendarEventFromRecord(record);

			if (!query.includeDeleted && event.deletedAt) {
				continue;
			}

			if (intervalsOverlap(event, range)) {
				entries.push({
					entityType: "calendar_event",
					item: event,
				});
			}
		}

		return entries.sort((left, right) =>
			left.item.startAt.localeCompare(right.item.startAt),
		);
	}

	async hasOverlap(
		userId: string,
		interval: ScheduleInterval,
		excluded?: ExcludedScheduleEntity,
	): Promise<boolean> {
		const db = getLocalDatabase();

		const [blocks, events] = await Promise.all([
			db.timeBlocks.where("userId").equals(userId).toArray(),

			db.calendarEvents.where("userId").equals(userId).toArray(),
		]);

		const overlappingBlock = blocks.some((record) => {
			const block = timeBlockFromRecord(record);

			if (
				excluded?.entityType === "time_block" &&
				excluded.entityId === block.id
			) {
				return false;
			}

			return (
				timeBlockBlocksSchedule(block) && intervalsOverlap(block, interval)
			);
		});

		if (overlappingBlock) {
			return true;
		}

		return events.some((record) => {
			const event = calendarEventFromRecord(record);

			if (
				excluded?.entityType === "calendar_event" &&
				excluded.entityId === event.id
			) {
				return false;
			}

			return event.deletedAt === null && intervalsOverlap(event, interval);
		});
	}
}
