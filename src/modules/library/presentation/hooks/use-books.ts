import { useLiveQuery } from "dexie-react-hooks";
import type { BookStatus } from "../../domain/book";
import { libraryDependencies } from "../../infrastructure/library.dependencies";

export function useBooks(
	userId: string,
	statuses: BookStatus[],
	search: string,
) {
	return useLiveQuery(
		() =>
			libraryDependencies.listBooks({
				userId,
				statuses: statuses.length > 0 ? statuses : undefined,
				search,
				includeDeleted: false,
			}),
		[userId, statuses.join(","), search],
		[],
	);
}
