import { getLocalDatabase } from "@/platform/database/local-database";
import type {
	SyncEntityType,
	SyncMetadataRecord,
	SyncOperationRecord,
} from "@/platform/sync/sync.types";
import { createSyncMetadataId } from "@/platform/sync/sync.types";
import type {
	BackupReason,
	DataBackupPayload,
	ImportMode,
} from "../domain/data-backup";
import type { LocalBackupRecord } from "../infrastructure/local/local-backup.record";
import { dataBackupPayloadSchema } from "../schemas/data-backup.schema";

const APP_VERSION = "1.11.0";
const MAX_LOCAL_BACKUPS = 20;

const DOMAIN_ENTITY_TYPES = [
	"task",
	"time_block",
	"calendar_event",
	"reminder",
	"book",
	"book_note",
	"user_settings",
	"daily_review",
] as const satisfies readonly SyncEntityType[];

export async function createDataBackupPayload(
	userId: string,
): Promise<DataBackupPayload> {
	const db = getLocalDatabase();

	const [
		tasks,
		timeBlocks,
		calendarEvents,
		reminders,
		books,
		bookNotes,
		userSettings,
		dailyReviews,
	] = await Promise.all([
		db.tasks.where("userId").equals(userId).toArray(),
		db.timeBlocks.where("userId").equals(userId).toArray(),
		db.calendarEvents.where("userId").equals(userId).toArray(),
		db.reminders.where("userId").equals(userId).toArray(),
		db.books.where("userId").equals(userId).toArray(),
		db.bookNotes.where("userId").equals(userId).toArray(),
		db.userSettings.where("userId").equals(userId).toArray(),
		db.dailyReviews.where("userId").equals(userId).toArray(),
	]);

	const entityKeys = new Set<string>();

	for (const item of tasks) {
		entityKeys.add(`task:${item.id}`);
	}

	for (const item of timeBlocks) {
		entityKeys.add(`time_block:${item.id}`);
	}

	for (const item of calendarEvents) {
		entityKeys.add(`calendar_event:${item.id}`);
	}

	for (const item of reminders) {
		entityKeys.add(`reminder:${item.id}`);
	}

	for (const item of books) {
		entityKeys.add(`book:${item.id}`);
	}

	for (const item of bookNotes) {
		entityKeys.add(`book_note:${item.id}`);
	}

	for (const item of userSettings) {
		entityKeys.add(`user_settings:${item.id}`);
	}

	for (const item of dailyReviews) {
		entityKeys.add(`daily_review:${item.id}`);
	}

	const allMetadata = await db.syncMetadata.toArray();

	const syncMetadata = allMetadata.filter((metadata) =>
		entityKeys.has(`${metadata.entityType}:${metadata.entityId}`),
	);

	return dataBackupPayloadSchema.parse({
		format: "personal-productivity-os-backup",
		schemaVersion: 3,
		appVersion: APP_VERSION,
		exportedAt: new Date().toISOString(),
		sourceUserId: userId,
		data: {
			tasks,
			timeBlocks,
			calendarEvents,
			reminders,
			books,
			bookNotes,
			userSettings,
			dailyReviews,
		},
		syncMetadata,
	});
}

export async function createLocalBackup(
	userId: string,
	reason: BackupReason,
	label?: string,
): Promise<LocalBackupRecord> {
	const db = getLocalDatabase();
	const payload = await createDataBackupPayload(userId);

	const serialized = JSON.stringify(payload);
	const createdAt = new Date().toISOString();

	const record: LocalBackupRecord = {
		id: crypto.randomUUID(),
		userId,
		reason,
		label: label?.trim() || defaultBackupLabel(reason, createdAt),
		schemaVersion: payload.schemaVersion,
		createdAt,
		sizeBytes: new Blob([serialized]).size,
		payload,
	};

	await db.localBackups.put(record);
	await pruneLocalBackups(userId);

	return record;
}

export async function deleteLocalBackup(
	id: string,
	userId: string,
): Promise<void> {
	const db = getLocalDatabase();
	const backup = await db.localBackups.get(id);

	if (!backup) {
		return;
	}

	if (backup.userId !== userId) {
		throw new Error("BACKUP_FORBIDDEN");
	}

	await db.localBackups.delete(id);
}

export async function importDataBackup(input: {
	payload: DataBackupPayload;
	userId: string;
	deviceId: string;
	mode: ImportMode;
	createSafetyBackup?: boolean;
}): Promise<{
	imported: number;
	skipped: number;
	operationsCreated: number;
	safetyBackupId: string | null;
}> {
	const payload: DataBackupPayload = dataBackupPayloadSchema.parse(
		input.payload,
	);

	const safetyBackup =
		input.createSafetyBackup === false
			? null
			: await createLocalBackup(
					input.userId,
					input.mode === "replace_local" ? "before_restore" : "before_import",
				);

	const db = getLocalDatabase();
	const metadataFromBackup = new Map<string, SyncMetadataRecord>(
		payload.syncMetadata.map((metadata) => [
			`${metadata.entityType}:${metadata.entityId}`,
			metadata,
		]),
	);

	let imported = 0;
	let skipped = 0;
	let operationsCreated = 0;

	await db.transaction(
		"rw",
		[
			db.tasks,
			db.timeBlocks,
			db.calendarEvents,
			db.reminders,
			db.books,
			db.bookNotes,
			db.userSettings,
			db.dailyReviews,
			db.syncOperations,
			db.syncMetadata,
			db.syncConflicts,
			db.syncCursors,
			db.syncRuntime,
		],
		async () => {
			if (input.mode === "replace_local") {
				await clearUserDomainData(input.userId);
			}

			let operationOffset = 0;

			const processRecord = async (
				entityType: (typeof DOMAIN_ENTITY_TYPES)[number],
				rawRecord: unknown,
			) => {
				const record = {
					...(rawRecord as Record<string, unknown>),
					userId: input.userId,
				} as Record<string, unknown> & {
					id: string;
					userId: string;
					updatedAt: string;
					deletedAt: string | null;
					version: number;
				};

				const existing = await getDomainEntity(entityType, record.id);

				if (
					input.mode === "merge" &&
					existing &&
					existing.updatedAt.localeCompare(record.updatedAt) >= 0
				) {
					skipped += 1;
					return;
				}

				const currentMetadata = await db.syncMetadata.get(
					createSyncMetadataId(entityType, record.id),
				);

				const backupMetadata = metadataFromBackup.get(
					`${entityType}:${record.id}`,
				);

				const remoteVersion =
					currentMetadata?.remoteVersion ??
					backupMetadata?.remoteVersion ??
					null;

				const operation =
					record.deletedAt && remoteVersion !== null
						? "delete"
						: remoteVersion === null
							? "create"
							: "update";

				if (record.deletedAt && remoteVersion === null) {
					await deleteDomainEntity(entityType, record.id);

					await deleteEntitySyncState(entityType, record.id);

					skipped += 1;
					return;
				}

				const localVersion = Math.max(
					record.version,
					existing?.version ? existing.version + 1 : 1,
				);

				const localRecord = {
					...record,
					version: localVersion,
					updatedAt: new Date(Date.now() + operationOffset).toISOString(),
				};

				operationOffset += 1;

				await putDomainEntity(entityType, localRecord);

				await deleteEntitySyncState(entityType, record.id, false);

				const operationId = crypto.randomUUID();
				const now = localRecord.updatedAt;

				const syncOperation: SyncOperationRecord = {
					id: operationId,
					userId: input.userId,
					deviceId: input.deviceId,
					entityType,
					entityId: record.id,
					operation,
					payload:
						operation === "delete"
							? {
									id: record.id,
									deletedAt: record.deletedAt,
									version: localVersion,
								}
							: localRecord,
					baseVersion: operation === "create" ? null : remoteVersion,
					status: "pending",
					attempts: 0,
					nextRetryAt: null,
					lastError: null,
					createdAt: now,
					updatedAt: now,
				};

				const metadata: SyncMetadataRecord = {
					id: createSyncMetadataId(entityType, record.id),
					entityType,
					entityId: record.id,
					localVersion,
					remoteVersion,
					state: "pending",
					lastSyncedAt:
						currentMetadata?.lastSyncedAt ??
						backupMetadata?.lastSyncedAt ??
						null,
					lastError: null,
					updatedAt: now,
				};

				await db.syncOperations.put(syncOperation);
				await db.syncMetadata.put(metadata);

				imported += 1;
				operationsCreated += 1;
			};

			for (const task of payload.data.tasks) {
				await processRecord("task", task);
			}

			for (const block of payload.data.timeBlocks) {
				await processRecord("time_block", block);
			}

			for (const event of payload.data.calendarEvents) {
				await processRecord("calendar_event", event);
			}

			for (const reminder of payload.data.reminders) {
				await processRecord("reminder", reminder);
			}

			for (const book of payload.data.books) {
				await processRecord("book", book);
			}

			for (const note of payload.data.bookNotes) {
				await processRecord("book_note", note);
			}

			for (const settings of payload.data.userSettings) {
				await processRecord("user_settings", settings);
			}

			for (const review of payload.data.dailyReviews) {
				await processRecord("daily_review", review);
			}
		},
	);

	return {
		imported,
		skipped,
		operationsCreated,
		safetyBackupId: safetyBackup?.id ?? null,
	};
}

async function clearUserDomainData(userId: string): Promise<void> {
	const db = getLocalDatabase();

	const [
		tasks,
		timeBlocks,
		calendarEvents,
		reminders,
		books,
		bookNotes,
		userSettings,
		dailyReviews,
		operations,
		conflicts,
		cursors,
		runtime,
	] = await Promise.all([
		db.tasks.where("userId").equals(userId).toArray(),
		db.timeBlocks.where("userId").equals(userId).toArray(),
		db.calendarEvents.where("userId").equals(userId).toArray(),
		db.reminders.where("userId").equals(userId).toArray(),
		db.books.where("userId").equals(userId).toArray(),
		db.bookNotes.where("userId").equals(userId).toArray(),
		db.userSettings.where("userId").equals(userId).toArray(),
		db.dailyReviews.where("userId").equals(userId).toArray(),
		db.syncOperations.where("userId").equals(userId).toArray(),
		db.syncConflicts.where("userId").equals(userId).toArray(),
		db.syncCursors.where("userId").equals(userId).toArray(),
		db.syncRuntime.where("userId").equals(userId).toArray(),
	]);

	const metadataIds = [
		...tasks.map((item) => createSyncMetadataId("task", item.id)),
		...timeBlocks.map((item) => createSyncMetadataId("time_block", item.id)),
		...calendarEvents.map((item) =>
			createSyncMetadataId("calendar_event", item.id),
		),
		...reminders.map((item) => createSyncMetadataId("reminder", item.id)),
		...books.map((item) => createSyncMetadataId("book", item.id)),
		...bookNotes.map((item) => createSyncMetadataId("book_note", item.id)),
		...userSettings.map((item) =>
			createSyncMetadataId("user_settings", item.id),
		),
		...dailyReviews.map((item) =>
			createSyncMetadataId("daily_review", item.id),
		),
		...operations
			.filter((item) =>
				DOMAIN_ENTITY_TYPES.includes(
					item.entityType as (typeof DOMAIN_ENTITY_TYPES)[number],
				),
			)
			.map((item) => createSyncMetadataId(item.entityType, item.entityId)),
		...conflicts
			.filter((item) =>
				DOMAIN_ENTITY_TYPES.includes(
					item.entityType as (typeof DOMAIN_ENTITY_TYPES)[number],
				),
			)
			.map((item) => createSyncMetadataId(item.entityType, item.entityId)),
	];

	await Promise.all([
		db.tasks.bulkDelete(tasks.map((item) => item.id)),
		db.timeBlocks.bulkDelete(timeBlocks.map((item) => item.id)),
		db.calendarEvents.bulkDelete(calendarEvents.map((item) => item.id)),
		db.reminders.bulkDelete(reminders.map((item) => item.id)),
		db.books.bulkDelete(books.map((item) => item.id)),
		db.bookNotes.bulkDelete(bookNotes.map((item) => item.id)),
		db.userSettings.bulkDelete(userSettings.map((item) => item.id)),
		db.dailyReviews.bulkDelete(dailyReviews.map((item) => item.id)),
		db.syncOperations.bulkDelete(operations.map((item) => item.id)),
		db.syncConflicts.bulkDelete(conflicts.map((item) => item.id)),
		db.syncCursors.bulkDelete(cursors.map((item) => item.id)),
		db.syncRuntime.bulkDelete(runtime.map((item) => item.id)),
		db.syncMetadata.bulkDelete(metadataIds),
	]);
}

async function getDomainEntity(
	entityType: (typeof DOMAIN_ENTITY_TYPES)[number],
	id: string,
): Promise<
	| {
			id: string;
			updatedAt: string;
			version: number;
	  }
	| undefined
> {
	const db = getLocalDatabase();

	switch (entityType) {
		case "task":
			return db.tasks.get(id);
		case "time_block":
			return db.timeBlocks.get(id);
		case "calendar_event":
			return db.calendarEvents.get(id);
		case "reminder":
			return db.reminders.get(id);
		case "book":
			return db.books.get(id);
		case "book_note":
			return db.bookNotes.get(id);
		case "user_settings":
			return db.userSettings.get(id);
		case "daily_review":
			return db.dailyReviews.get(id);
	}
}

async function putDomainEntity(
	entityType: (typeof DOMAIN_ENTITY_TYPES)[number],
	value: Record<string, unknown>,
): Promise<void> {
	const db = getLocalDatabase();

	switch (entityType) {
		case "task":
			await db.tasks.put(value as never);
			return;
		case "time_block":
			await db.timeBlocks.put(value as never);
			return;
		case "calendar_event":
			await db.calendarEvents.put(value as never);
			return;
		case "reminder":
			await db.reminders.put(value as never);
			return;
		case "book":
			await db.books.put(value as never);
			return;
		case "book_note":
			await db.bookNotes.put(value as never);
			return;
		case "user_settings":
			await db.userSettings.put(value as never);
			return;
		case "daily_review":
			await db.dailyReviews.put(value as never);
	}
}

async function deleteDomainEntity(
	entityType: (typeof DOMAIN_ENTITY_TYPES)[number],
	id: string,
): Promise<void> {
	const db = getLocalDatabase();

	switch (entityType) {
		case "task":
			await db.tasks.delete(id);
			return;
		case "time_block":
			await db.timeBlocks.delete(id);
			return;
		case "calendar_event":
			await db.calendarEvents.delete(id);
			return;
		case "reminder":
			await db.reminders.delete(id);
			return;
		case "book":
			await db.books.delete(id);
			return;
		case "book_note":
			await db.bookNotes.delete(id);
			return;
		case "user_settings":
			await db.userSettings.delete(id);
			return;
		case "daily_review":
			await db.dailyReviews.delete(id);
	}
}

async function deleteEntitySyncState(
	entityType: (typeof DOMAIN_ENTITY_TYPES)[number],
	entityId: string,
	deleteMetadata = true,
): Promise<void> {
	const db = getLocalDatabase();

	const [operations, conflicts] = await Promise.all([
		db.syncOperations
			.where("[entityType+entityId]")
			.equals([entityType, entityId])
			.toArray(),

		db.syncConflicts
			.where("[entityType+entityId]")
			.equals([entityType, entityId])
			.toArray(),
	]);

	await Promise.all([
		db.syncOperations.bulkDelete(operations.map((item) => item.id)),
		db.syncConflicts.bulkDelete(conflicts.map((item) => item.id)),
		deleteMetadata
			? db.syncMetadata.delete(createSyncMetadataId(entityType, entityId))
			: Promise.resolve(),
	]);
}

async function pruneLocalBackups(userId: string): Promise<void> {
	const db = getLocalDatabase();

	const backups = await db.localBackups
		.where("userId")
		.equals(userId)
		.toArray();

	const oldestFirst = backups.sort((left, right) =>
		left.createdAt.localeCompare(right.createdAt),
	);

	const excess = Math.max(0, oldestFirst.length - MAX_LOCAL_BACKUPS);

	if (excess > 0) {
		await db.localBackups.bulkDelete(
			oldestFirst.slice(0, excess).map((backup) => backup.id),
		);
	}
}

function defaultBackupLabel(reason: BackupReason, createdAt: string): string {
	const date = new Intl.DateTimeFormat("es-PE", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(createdAt));

	const prefix = {
		manual: "Backup manual",
		before_import: "Antes de importar",
		before_restore: "Antes de restaurar",
	}[reason];

	return `${prefix} · ${date}`;
}
