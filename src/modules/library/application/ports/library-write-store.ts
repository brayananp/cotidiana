import type { SyncOperationType } from "@/platform/sync/sync.types";
import type { Book } from "../../domain/book";
import type { BookNote } from "../../domain/book-note";

export type LibraryCommitResult =
	| {
			type: "queued";
			operationId: string;
	  }
	| {
			type: "removed_local_only";
	  };

export interface LibraryWriteStore {
	commitBook(
		book: Book,
		operation: SyncOperationType,
		deviceId: string,
	): Promise<LibraryCommitResult>;

	commitNote(
		note: BookNote,
		operation: SyncOperationType,
		deviceId: string,
	): Promise<LibraryCommitResult>;

	deleteBookWithNotes(
		book: Book,
		notes: BookNote[],
		deviceId: string,
	): Promise<void>;
}
