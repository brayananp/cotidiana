import { and, asc, eq, gt, isNull } from "drizzle-orm";
import {
	type BookNoteSyncSnapshot,
	type BookSyncSnapshot,
	bookNoteSyncSnapshotSchema,
	bookSyncSnapshotSchema,
	libraryDeletePayloadSchema,
	type PullLibraryInput,
	type PushLibraryInput,
	type PushLibraryOperationInput,
	pullLibraryInputSchema,
	pushLibraryInputSchema,
} from "@/platform/sync/library-sync.schemas";
import type {
	PullLibraryChange,
	PushOperationResult,
	SyncOperationType,
} from "@/platform/sync/sync.types";
import { requireServerSession } from "@/server/auth/require-session.server";
import { db } from "@/server/database/client.server";
import { device } from "@/server/database/schema/device.schema";
import { book, bookNote } from "@/server/database/schema/library.schema";
import {
	processedOperation,
	syncChange,
} from "@/server/database/schema/sync.schema";
import { attemptVersionedWrite } from "./versioned-write-server";

export async function pushLibraryOperations(
	rawInput: PushLibraryInput,
): Promise<{
	results: PushOperationResult[];
}> {
	const input = pushLibraryInputSchema.parse(rawInput);

	const session = await requireServerSession();

	await requireRegisteredDevice(session.user.id, input.deviceId);

	const results = await db.transaction(async (transaction) => {
		const values: PushOperationResult[] = [];

		for (const operation of input.operations) {
			values.push(
				await processOperation(
					transaction,
					session.user.id,
					input.deviceId,
					operation,
				),
			);
		}

		return values;
	});

	return { results };
}

export async function pullLibraryChanges(rawInput: PullLibraryInput): Promise<{
	changes: PullLibraryChange[];
	nextCursor: number;
	hasMore: boolean;
}> {
	const input = pullLibraryInputSchema.parse(rawInput);

	const session = await requireServerSession();

	await requireRegisteredDevice(session.user.id, input.deviceId);

	const rows = await db
		.select()
		.from(syncChange)
		.where(
			and(
				eq(syncChange.userId, session.user.id),
				eq(syncChange.entityType, input.entityType),
				gt(syncChange.sequence, input.cursor),
			),
		)
		.orderBy(asc(syncChange.sequence))
		.limit(input.limit + 1);

	const hasMore = rows.length > input.limit;

	const selected = hasMore ? rows.slice(0, input.limit) : rows;

	const changes: PullLibraryChange[] = selected.map((row) => ({
		sequence: row.sequence,
		entityType: input.entityType,
		entityId: row.entityId,
		operation: parseOperationType(row.operation),
		version: row.version,
		payload:
			input.entityType === "book"
				? bookSyncSnapshotSchema.parse(row.payload)
				: bookNoteSyncSnapshotSchema.parse(row.payload),
		createdAt: row.createdAt.toISOString(),
	}));

	return {
		changes,
		nextCursor: changes.at(-1)?.sequence ?? input.cursor,
		hasMore,
	};
}

type SyncTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function loadBook(
	transaction: SyncTransaction,
	userId: string,
	entityId: string,
) {
	const [row] = await transaction
		.select()
		.from(book)
		.where(and(eq(book.id, entityId), eq(book.userId, userId)))
		.limit(1);

	return row;
}

async function loadBookNote(
	transaction: SyncTransaction,
	userId: string,
	entityId: string,
) {
	const [row] = await transaction
		.select()
		.from(bookNote)
		.where(and(eq(bookNote.id, entityId), eq(bookNote.userId, userId)))
		.limit(1);

	return row;
}

async function processOperation(
	transaction: SyncTransaction,
	userId: string,
	deviceId: string,
	operation: PushLibraryOperationInput,
): Promise<PushOperationResult> {
	const [duplicate] = await transaction
		.select()
		.from(processedOperation)
		.where(
			and(
				eq(processedOperation.operationId, operation.operationId),
				eq(processedOperation.userId, userId),
			),
		)
		.limit(1);

	if (duplicate) {
		return {
			...(duplicate.result as PushOperationResult),
			duplicate: true,
		};
	}

	const result =
		operation.entityType === "book"
			? await processBookOperation(transaction, userId, operation)
			: await processBookNoteOperation(transaction, userId, operation);

	await transaction.insert(processedOperation).values({
		operationId: operation.operationId,
		userId,
		deviceId,
		result,
		processedAt: new Date(),
	});

	return result;
}

async function processBookOperation(
	transaction: SyncTransaction,
	userId: string,
	operation: PushLibraryOperationInput,
): Promise<PushOperationResult> {
	const remote = await loadBook(transaction, userId, operation.entityId);

	if (operation.operation === "delete") {
		return deleteBook(transaction, userId, operation, remote);
	}

	const parsed = bookSyncSnapshotSchema.safeParse(operation.payload);

	if (!parsed.success) {
		return rejected(operation, "INVALID_BOOK_PAYLOAD");
	}

	if (parsed.data.id !== operation.entityId || parsed.data.userId !== userId) {
		return rejected(operation, "ENTITY_OR_USER_MISMATCH");
	}

	if (operation.operation === "create") {
		if (remote) {
			return conflict(operation, "BOOK_ALREADY_EXISTS", toBookSnapshot(remote));
		}

		const now = new Date();

		const snapshot: BookSyncSnapshot = {
			...parsed.data,
			userId,
			version: 1,
			updatedAt: now.toISOString(),
		};

		await transaction.insert(book).values(bookSnapshotToInsert(snapshot));

		await appendChange(transaction, userId, "book", "create", snapshot, now);

		return applied(operation, snapshot);
	}

	if (!remote) {
		return rejected(operation, "BOOK_NOT_FOUND");
	}

	if (remote.deletedAt) {
		return rejected(operation, "BOOK_ALREADY_DELETED");
	}

	if (operation.baseVersion !== remote.version) {
		return conflict(operation, "VERSION_MISMATCH", toBookSnapshot(remote));
	}

	const now = new Date();

	const snapshot: BookSyncSnapshot = {
		...parsed.data,
		userId,
		createdAt: remote.createdAt.toISOString(),
		updatedAt: now.toISOString(),
		version: remote.version + 1,
	};

	const write = await attemptVersionedWrite({
		expectedVersion: remote.version,
		writeIfVersion: async (expectedVersion) => {
			const [updated] = await transaction
				.update(book)
				.set(bookSnapshotToUpdate(snapshot))
				.where(
					and(
						eq(book.id, operation.entityId),
						eq(book.userId, userId),
						eq(book.version, expectedVersion),
					),
				)
				.returning();

			return updated ?? null;
		},
		loadCurrent: async () =>
			(await loadBook(transaction, userId, operation.entityId)) ?? null,
	});

	if (write.status === "stale") {
		return write.current
			? conflict(operation, "VERSION_MISMATCH", toBookSnapshot(write.current))
			: rejected(operation, "BOOK_NOT_FOUND");
	}

	await appendChange(transaction, userId, "book", "update", snapshot, now);

	return applied(operation, snapshot);
}

async function processBookNoteOperation(
	transaction: SyncTransaction,
	userId: string,
	operation: PushLibraryOperationInput,
): Promise<PushOperationResult> {
	const remote = await loadBookNote(transaction, userId, operation.entityId);

	if (operation.operation === "delete") {
		return deleteBookNote(transaction, userId, operation, remote);
	}

	const parsed = bookNoteSyncSnapshotSchema.safeParse(operation.payload);

	if (!parsed.success) {
		return rejected(operation, "INVALID_BOOK_NOTE_PAYLOAD");
	}

	if (parsed.data.id !== operation.entityId || parsed.data.userId !== userId) {
		return rejected(operation, "ENTITY_OR_USER_MISMATCH");
	}

	const [parent] = await transaction
		.select()
		.from(book)
		.where(and(eq(book.id, parsed.data.bookId), eq(book.userId, userId)))
		.limit(1);

	if (!parent || parent.deletedAt) {
		return rejected(operation, "PARENT_BOOK_NOT_FOUND");
	}

	if (
		parsed.data.page !== null &&
		parent.pageCount !== null &&
		parsed.data.page > parent.pageCount
	) {
		return rejected(operation, "BOOK_NOTE_PAGE_EXCEEDS_BOOK");
	}

	if (operation.operation === "create") {
		if (remote) {
			return conflict(
				operation,
				"BOOK_NOTE_ALREADY_EXISTS",
				toBookNoteSnapshot(remote),
			);
		}

		const now = new Date();

		const snapshot: BookNoteSyncSnapshot = {
			...parsed.data,
			userId,
			version: 1,
			updatedAt: now.toISOString(),
		};

		await transaction
			.insert(bookNote)
			.values(bookNoteSnapshotToInsert(snapshot));

		await appendChange(
			transaction,
			userId,
			"book_note",
			"create",
			snapshot,
			now,
		);

		return applied(operation, snapshot);
	}

	if (!remote) {
		return rejected(operation, "BOOK_NOTE_NOT_FOUND");
	}

	if (remote.deletedAt) {
		return rejected(operation, "BOOK_NOTE_ALREADY_DELETED");
	}

	if (operation.baseVersion !== remote.version) {
		return conflict(operation, "VERSION_MISMATCH", toBookNoteSnapshot(remote));
	}

	const now = new Date();

	const snapshot: BookNoteSyncSnapshot = {
		...parsed.data,
		userId,
		bookId: remote.bookId,
		createdAt: remote.createdAt.toISOString(),
		updatedAt: now.toISOString(),
		version: remote.version + 1,
	};

	const write = await attemptVersionedWrite({
		expectedVersion: remote.version,
		writeIfVersion: async (expectedVersion) => {
			const [updated] = await transaction
				.update(bookNote)
				.set(bookNoteSnapshotToUpdate(snapshot))
				.where(
					and(
						eq(bookNote.id, operation.entityId),
						eq(bookNote.userId, userId),
						eq(bookNote.version, expectedVersion),
					),
				)
				.returning();

			return updated ?? null;
		},
		loadCurrent: async () =>
			(await loadBookNote(transaction, userId, operation.entityId)) ?? null,
	});

	if (write.status === "stale") {
		return write.current
			? conflict(
					operation,
					"VERSION_MISMATCH",
					toBookNoteSnapshot(write.current),
				)
			: rejected(operation, "BOOK_NOTE_NOT_FOUND");
	}

	await appendChange(transaction, userId, "book_note", "update", snapshot, now);

	return applied(operation, snapshot);
}

async function deleteBook(
	transaction: SyncTransaction,
	userId: string,
	operation: PushLibraryOperationInput,
	remote: typeof book.$inferSelect | undefined,
): Promise<PushOperationResult> {
	const parsed = libraryDeletePayloadSchema.safeParse(operation.payload);

	if (!parsed.success) {
		return rejected(operation, "INVALID_DELETE_PAYLOAD");
	}

	if (!remote) {
		return rejected(operation, "BOOK_NOT_FOUND");
	}

	if (operation.baseVersion !== remote.version) {
		return conflict(operation, "VERSION_MISMATCH", toBookSnapshot(remote));
	}

	const now = new Date();

	const snapshot: BookSyncSnapshot = {
		...toBookSnapshot(remote),
		deletedAt: now.toISOString(),
		updatedAt: now.toISOString(),
		version: remote.version + 1,
	};

	const write = await attemptVersionedWrite({
		expectedVersion: remote.version,
		writeIfVersion: async (expectedVersion) => {
			const [updated] = await transaction
				.update(book)
				.set({
					deletedAt: now,
					updatedAt: now,
					version: snapshot.version,
				})
				.where(
					and(
						eq(book.id, remote.id),
						eq(book.userId, userId),
						eq(book.version, expectedVersion),
					),
				)
				.returning();

			return updated ?? null;
		},
		loadCurrent: async () =>
			(await loadBook(transaction, userId, remote.id)) ?? null,
	});

	if (write.status === "stale") {
		return write.current
			? conflict(operation, "VERSION_MISMATCH", toBookSnapshot(write.current))
			: rejected(operation, "BOOK_NOT_FOUND");
	}

	await appendChange(transaction, userId, "book", "delete", snapshot, now);

	return applied(operation, snapshot);
}

async function deleteBookNote(
	transaction: SyncTransaction,
	userId: string,
	operation: PushLibraryOperationInput,
	remote: typeof bookNote.$inferSelect | undefined,
): Promise<PushOperationResult> {
	const parsed = libraryDeletePayloadSchema.safeParse(operation.payload);

	if (!parsed.success) {
		return rejected(operation, "INVALID_DELETE_PAYLOAD");
	}

	if (!remote) {
		return rejected(operation, "BOOK_NOTE_NOT_FOUND");
	}

	if (operation.baseVersion !== remote.version) {
		return conflict(operation, "VERSION_MISMATCH", toBookNoteSnapshot(remote));
	}

	const now = new Date();

	const snapshot: BookNoteSyncSnapshot = {
		...toBookNoteSnapshot(remote),
		deletedAt: now.toISOString(),
		updatedAt: now.toISOString(),
		version: remote.version + 1,
	};

	const write = await attemptVersionedWrite({
		expectedVersion: remote.version,
		writeIfVersion: async (expectedVersion) => {
			const [updated] = await transaction
				.update(bookNote)
				.set({
					deletedAt: now,
					updatedAt: now,
					version: snapshot.version,
				})
				.where(
					and(
						eq(bookNote.id, remote.id),
						eq(bookNote.userId, userId),
						eq(bookNote.version, expectedVersion),
					),
				)
				.returning();

			return updated ?? null;
		},
		loadCurrent: async () =>
			(await loadBookNote(transaction, userId, remote.id)) ?? null,
	});

	if (write.status === "stale") {
		return write.current
			? conflict(
					operation,
					"VERSION_MISMATCH",
					toBookNoteSnapshot(write.current),
				)
			: rejected(operation, "BOOK_NOTE_NOT_FOUND");
	}

	await appendChange(transaction, userId, "book_note", "delete", snapshot, now);

	return applied(operation, snapshot);
}

async function appendChange(
	transaction: SyncTransaction,
	userId: string,
	entityType: "book" | "book_note",
	operation: SyncOperationType,
	snapshot: BookSyncSnapshot | BookNoteSyncSnapshot,
	now: Date,
): Promise<void> {
	await transaction.insert(syncChange).values({
		userId,
		entityType,
		entityId: snapshot.id,
		operation,
		version: snapshot.version,
		payload: snapshot,
		createdAt: now,
	});
}

async function requireRegisteredDevice(
	userId: string,
	deviceId: string,
): Promise<void> {
	const [registered] = await db
		.select()
		.from(device)
		.where(
			and(
				eq(device.id, deviceId),
				eq(device.userId, userId),
				isNull(device.revokedAt),
			),
		)
		.limit(1);

	if (!registered) {
		throw new Error("DEVICE_NOT_REGISTERED");
	}
}

function applied(
	operation: PushLibraryOperationInput,
	snapshot: BookSyncSnapshot | BookNoteSyncSnapshot,
): PushOperationResult {
	return {
		operationId: operation.operationId,
		entityId: operation.entityId,
		status: "applied",
		duplicate: false,
		version: snapshot.version,
		serverPayload: snapshot,
	};
}

function rejected(
	operation: PushLibraryOperationInput,
	reason: string,
): PushOperationResult {
	return {
		operationId: operation.operationId,
		entityId: operation.entityId,
		status: "rejected",
		duplicate: false,
		reason,
	};
}

function conflict(
	operation: PushLibraryOperationInput,
	reason: string,
	snapshot: BookSyncSnapshot | BookNoteSyncSnapshot,
): PushOperationResult {
	return {
		operationId: operation.operationId,
		entityId: operation.entityId,
		status: "conflict",
		duplicate: false,
		reason,
		serverVersion: snapshot.version,
		serverPayload: snapshot,
	};
}

function toBookSnapshot(row: typeof book.$inferSelect): BookSyncSnapshot {
	return {
		id: row.id,
		userId: row.userId,
		title: row.title,
		author: row.author,
		isbn: row.isbn,
		description: row.description,
		coverUrl: row.coverUrl,
		status: row.status,
		pageCount: row.pageCount,
		currentPage: row.currentPage,
		rating: row.rating,
		tags: row.tags,
		startedAt: row.startedAt?.toISOString() ?? null,
		completedAt: row.completedAt?.toISOString() ?? null,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		deletedAt: row.deletedAt?.toISOString() ?? null,
		version: row.version,
	};
}

function toBookNoteSnapshot(
	row: typeof bookNote.$inferSelect,
): BookNoteSyncSnapshot {
	return {
		id: row.id,
		userId: row.userId,
		bookId: row.bookId,
		type: row.type,
		content: row.content,
		page: row.page,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		deletedAt: row.deletedAt?.toISOString() ?? null,
		version: row.version,
	};
}

function bookSnapshotToInsert(snapshot: BookSyncSnapshot) {
	return {
		id: snapshot.id,
		userId: snapshot.userId,
		title: snapshot.title,
		author: snapshot.author,
		isbn: snapshot.isbn,
		description: snapshot.description,
		coverUrl: snapshot.coverUrl,
		status: snapshot.status,
		pageCount: snapshot.pageCount,
		currentPage: snapshot.currentPage,
		rating: snapshot.rating,
		tags: snapshot.tags,
		startedAt: snapshot.startedAt ? new Date(snapshot.startedAt) : null,
		completedAt: snapshot.completedAt ? new Date(snapshot.completedAt) : null,
		version: snapshot.version,
		createdAt: new Date(snapshot.createdAt),
		updatedAt: new Date(snapshot.updatedAt),
		deletedAt: snapshot.deletedAt ? new Date(snapshot.deletedAt) : null,
	};
}

function bookSnapshotToUpdate(snapshot: BookSyncSnapshot) {
	const {
		id: _id,
		userId: _userId,
		createdAt: _createdAt,
		...values
	} = bookSnapshotToInsert(snapshot);

	return values;
}

function bookNoteSnapshotToInsert(snapshot: BookNoteSyncSnapshot) {
	return {
		id: snapshot.id,
		userId: snapshot.userId,
		bookId: snapshot.bookId,
		type: snapshot.type,
		content: snapshot.content,
		page: snapshot.page,
		version: snapshot.version,
		createdAt: new Date(snapshot.createdAt),
		updatedAt: new Date(snapshot.updatedAt),
		deletedAt: snapshot.deletedAt ? new Date(snapshot.deletedAt) : null,
	};
}

function bookNoteSnapshotToUpdate(snapshot: BookNoteSyncSnapshot) {
	const {
		id: _id,
		userId: _userId,
		bookId: _bookId,
		createdAt: _createdAt,
		...values
	} = bookNoteSnapshotToInsert(snapshot);

	return values;
}

function parseOperationType(value: string): SyncOperationType {
	if (value === "create" || value === "update" || value === "delete") {
		return value;
	}

	throw new Error("INVALID_SYNC_OPERATION");
}
