import type { BookQuery } from "../../domain/library-query";
import type { LibraryRepository } from "../../domain/repositories/library.repository";

export function listBooksQuery(repository: LibraryRepository) {
	return (query: BookQuery) => repository.listBooks(query);
}
