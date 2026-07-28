import { getLocalDatabase } from "@/platform/database/local-database";
import { requestLibrarySync } from "@/platform/sync/library-sync-events-client";
import {
	createSyncMetadataId,
	type SyncMetadataRecord,
	type SyncOperationRecord,
	type SyncOperationType,
} from "@/platform/sync/sync.types";
import type {
	LibraryCommitResult,
	LibraryWriteStore,
} from "../../application/ports/library-write-store";
import type { Book } from "../../domain/book";
import type { BookNote } from "../../domain/book-note";
import { bookNoteToRecord, bookToRecord } from "./library.mapper";

type LibraryEntity =
	| {
			entityType: "book";
			item: Book;
	  }
	| {
			entityType: "book_note";
			item: BookNote;
	  };

export class DexieLibraryWriteStore implements LibraryWriteStore {
	async commitBook(
		book: Book,
		operation: SyncOperationType,
		deviceId: string,
	): Promise<LibraryCommitResult> {
		const result = await this.commit(
			{
				entityType: "book",
				item: book,
			},
			operation,
			deviceId,
		);

		requestLibrarySync();
		return result;
	}

	async commitNote(
		note: BookNote,
		operation: SyncOperationType,
		deviceId: string,
	): Promise<LibraryCommitResult> {
		const result = await this.commit(
			{
				entityType: "book_note",
				item: note,
			},
			operation,
			deviceId,
		);

		requestLibrarySync();
		return result;
	}

	async deleteBookWithNotes(
		book: Book,
		notes: BookNote[],
		deviceId: string,
	): Promise<void> {
		const db = getLocalDatabase();

		await db.transaction(
			"rw",
			db.books,
			db.bookNotes,
			db.syncOperations,
			db.syncMetadata,
			async () => {
				await this.commitInsideTransaction(
					{
						entityType: "book",
						item: book,
					},
					"delete",
					deviceId,
				);

				for (const note of notes) {
					await this.commitInsideTransaction(
						{
							entityType: "book_note",
							item: note,
						},
						"delete",
						deviceId,
					);
				}
			},
		);

		requestLibrarySync();
	}

	private async commit(
		entity: LibraryEntity,
		operation: SyncOperationType,
		deviceId: string,
	): Promise<LibraryCommitResult> {
		const db = getLocalDatabase();

		return db.transaction(
			"rw",
			db.books,
			db.bookNotes,
			db.syncOperations,
			db.syncMetadata,
			() => this.commitInsideTransaction(entity, operation, deviceId),
		);
	}

	private async commitInsideTransaction(
		entity: LibraryEntity,
		requestedOperation: SyncOperationType,
		deviceId: string,
	): Promise<LibraryCommitResult> {
		const db = getLocalDatabase();
		const item = entity.item;

		const existingOperations = await db.syncOperations
			.where("[entityType+entityId]")
			.equals([entity.entityType, item.id])
			.toArray();

		const compactableOperations = existingOperations.filter(
			(operation) => operation.status === "pending" && operation.attempts === 0,
		);

		const compactableCreate = compactableOperations.find(
			(operation) => operation.operation === "create",
		);

		const compactableIds = new Set(
			compactableOperations.map((operation) => operation.id),
		);

		const nonCompactableOperations = existingOperations.filter(
			(operation) => !compactableIds.has(operation.id),
		);

		if (
			requestedOperation === "delete" &&
			compactableCreate &&
			nonCompactableOperations.length === 0
		) {
			if (entity.entityType === "book") {
				await db.books.delete(item.id);
			} else {
				await db.bookNotes.delete(item.id);
			}

			await db.syncOperations.bulkDelete(
				compactableOperations.map((operation) => operation.id),
			);

			await db.syncMetadata.delete(
				createSyncMetadataId(entity.entityType, item.id),
			);

			return {
				type: "removed_local_only",
			};
		}

		const effectiveOperation =
			compactableCreate && requestedOperation === "update"
				? "create"
				: requestedOperation;

		const metadataId = createSyncMetadataId(entity.entityType, item.id);

		const existingMetadata = await db.syncMetadata.get(metadataId);

		const now = new Date().toISOString();

		const operationId = crypto.randomUUID();

		const operation: SyncOperationRecord = {
			id: operationId,
			userId: item.userId,
			deviceId,
			entityType: entity.entityType,
			entityId: item.id,
			operation: effectiveOperation,
			payload:
				effectiveOperation === "delete"
					? {
							id: item.id,
							deletedAt: item.deletedAt,
							version: item.version,
						}
					: item,
			baseVersion:
				effectiveOperation === "create"
					? null
					: (existingMetadata?.remoteVersion ?? null),
			status: "pending",
			attempts: 0,
			nextRetryAt: null,
			lastError: null,
			createdAt: compactableOperations[0]?.createdAt ?? now,
			updatedAt: now,
		};

		const metadata: SyncMetadataRecord = {
			id: metadataId,
			entityType: entity.entityType,
			entityId: item.id,
			localVersion: item.version,
			remoteVersion: existingMetadata?.remoteVersion ?? null,
			state: "pending",
			lastSyncedAt: existingMetadata?.lastSyncedAt ?? null,
			lastError: null,
			updatedAt: now,
		};

		if (entity.entityType === "book") {
			await db.books.put(bookToRecord(entity.item));
		} else {
			await db.bookNotes.put(bookNoteToRecord(entity.item));
		}

		if (compactableOperations.length) {
			await db.syncOperations.bulkDelete(
				compactableOperations.map((operation) => operation.id),
			);
		}

		await db.syncOperations.put(operation);

		await db.syncMetadata.put(metadata);

		return {
			type: "queued",
			operationId,
		};
	}
}
