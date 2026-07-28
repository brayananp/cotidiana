import {
	assertBookOwnership,
	updateBookProgressEntity,
} from "../../domain/book";
import type { LibraryRepository } from "../../domain/repositories/library.repository";
import type { LibraryExecutionContext } from "../library-context";
import type { LibraryWriteStore } from "../ports/library-write-store";

export function updateBookProgressCommand(
	repository: LibraryRepository,
	writeStore: LibraryWriteStore,
) {
	return async (
		id: string,
		currentPage: number,
		context: LibraryExecutionContext,
	) => {
		const existing = await repository.findBookById(id);

		if (!existing) {
			throw new Error("BOOK_NOT_FOUND");
		}

		assertBookOwnership(existing, context.userId);

		const updated = updateBookProgressEntity(existing, currentPage);

		await writeStore.commitBook(updated, "update", context.deviceId);

		return updated;
	};
}
