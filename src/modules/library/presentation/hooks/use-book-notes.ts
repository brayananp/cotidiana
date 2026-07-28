import { useLiveQuery } from "dexie-react-hooks";
import { libraryDependencies } from "../../infrastructure/library.dependencies";

export function useBookNotes(userId: string, bookId: string | null) {
	return useLiveQuery(
		() =>
			bookId
				? libraryDependencies.listNotes({
						userId,
						bookId,
						includeDeleted: false,
					})
				: Promise.resolve([]),
		[userId, bookId],
		[],
	);
}
