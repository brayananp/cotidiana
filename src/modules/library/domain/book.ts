export const BOOK_STATUSES = [
	"want_to_read",
	"reading",
	"completed",
	"paused",
	"dropped",
] as const;

export type BookStatus = (typeof BOOK_STATUSES)[number];

export type Book = {
	id: string;
	userId: string;
	title: string;
	author: string | null;
	isbn: string | null;
	description: string | null;
	coverUrl: string | null;
	status: BookStatus;
	pageCount: number | null;
	currentPage: number;
	rating: number | null;
	tags: string[];
	startedAt: string | null;
	completedAt: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	version: number;
};

export type CreateBookEntityInput = {
	userId: string;
	title: string;
	author: string | null;
	isbn: string | null;
	description: string | null;
	coverUrl: string | null;
	status: BookStatus;
	pageCount: number | null;
	currentPage: number;
	rating: number | null;
	tags: string[];
};

export type UpdateBookEntityInput = Omit<CreateBookEntityInput, "userId">;

export function createBookEntity(
	input: CreateBookEntityInput,
	now = new Date(),
): Book {
	assertProgress(input.currentPage, input.pageCount);

	assertRating(input.rating);

	const timestamp = now.toISOString();
	const normalizedStatus = normalizeStatus(
		input.status,
		input.currentPage,
		input.pageCount,
	);

	return {
		id: crypto.randomUUID(),
		userId: input.userId,
		title: normalizeRequiredText(input.title, "BOOK_TITLE_REQUIRED"),
		author: normalizeNullableText(input.author),
		isbn: normalizeIsbn(input.isbn),
		description: normalizeNullableText(input.description),
		coverUrl: normalizeNullableText(input.coverUrl),
		status: normalizedStatus.status,
		pageCount: input.pageCount,
		currentPage: normalizedStatus.currentPage,
		rating: input.rating,
		tags: normalizeTags(input.tags),
		startedAt: normalizedStatus.status === "reading" ? timestamp : null,
		completedAt: normalizedStatus.status === "completed" ? timestamp : null,
		createdAt: timestamp,
		updatedAt: timestamp,
		deletedAt: null,
		version: 1,
	};
}

export function updateBookEntity(
	book: Book,
	input: UpdateBookEntityInput,
	now = new Date(),
): Book {
	assertEditable(book);
	assertProgress(input.currentPage, input.pageCount);
	assertRating(input.rating);

	const normalizedStatus = normalizeStatus(
		input.status,
		input.currentPage,
		input.pageCount,
	);

	return {
		...book,
		title: normalizeRequiredText(input.title, "BOOK_TITLE_REQUIRED"),
		author: normalizeNullableText(input.author),
		isbn: normalizeIsbn(input.isbn),
		description: normalizeNullableText(input.description),
		coverUrl: normalizeNullableText(input.coverUrl),
		status: normalizedStatus.status,
		pageCount: input.pageCount,
		currentPage: normalizedStatus.currentPage,
		rating: input.rating,
		tags: normalizeTags(input.tags),
		startedAt:
			book.startedAt ??
			(normalizedStatus.status === "reading" ? now.toISOString() : null),
		completedAt:
			normalizedStatus.status === "completed"
				? (book.completedAt ?? now.toISOString())
				: null,
		updatedAt: now.toISOString(),
		version: book.version + 1,
	};
}

export function updateBookProgressEntity(
	book: Book,
	currentPage: number,
	now = new Date(),
): Book {
	assertEditable(book);
	assertProgress(currentPage, book.pageCount);

	const completed = book.pageCount !== null && currentPage >= book.pageCount;

	return {
		...book,
		status: completed ? "completed" : currentPage > 0 ? "reading" : book.status,
		currentPage:
			completed && book.pageCount !== null ? book.pageCount : currentPage,
		startedAt: book.startedAt ?? (currentPage > 0 ? now.toISOString() : null),
		completedAt: completed ? (book.completedAt ?? now.toISOString()) : null,
		updatedAt: now.toISOString(),
		version: book.version + 1,
	};
}

export function deleteBookEntity(book: Book, now = new Date()): Book {
	assertEditable(book);

	return {
		...book,
		deletedAt: now.toISOString(),
		updatedAt: now.toISOString(),
		version: book.version + 1,
	};
}

export function assertBookOwnership(book: Book, userId: string): void {
	if (book.userId !== userId) {
		throw new Error("BOOK_FORBIDDEN");
	}
}

export function calculateBookProgress(
	book: Pick<Book, "currentPage" | "pageCount">,
): number | null {
	if (book.pageCount === null || book.pageCount <= 0) {
		return null;
	}

	return Math.min(100, Math.round((book.currentPage / book.pageCount) * 100));
}

function normalizeStatus(
	status: BookStatus,
	currentPage: number,
	pageCount: number | null,
): {
	status: BookStatus;
	currentPage: number;
} {
	if (status === "completed") {
		return {
			status,
			currentPage: pageCount ?? currentPage,
		};
	}

	if (pageCount !== null && currentPage >= pageCount) {
		return {
			status: "completed",
			currentPage: pageCount,
		};
	}

	return {
		status,
		currentPage,
	};
}

function assertProgress(currentPage: number, pageCount: number | null): void {
	if (!Number.isInteger(currentPage) || currentPage < 0) {
		throw new Error("INVALID_CURRENT_PAGE");
	}

	if (pageCount !== null && (!Number.isInteger(pageCount) || pageCount < 1)) {
		throw new Error("INVALID_PAGE_COUNT");
	}

	if (pageCount !== null && currentPage > pageCount) {
		throw new Error("CURRENT_PAGE_EXCEEDS_PAGE_COUNT");
	}
}

function assertRating(rating: number | null): void {
	if (
		rating !== null &&
		(!Number.isInteger(rating) || rating < 1 || rating > 5)
	) {
		throw new Error("INVALID_BOOK_RATING");
	}
}

function assertEditable(book: Book): void {
	if (book.deletedAt) {
		throw new Error("BOOK_ALREADY_DELETED");
	}
}

function normalizeRequiredText(value: string, error: string): string {
	const normalized = value.trim();

	if (!normalized) {
		throw new Error(error);
	}

	return normalized;
}

function normalizeNullableText(value: string | null): string | null {
	const normalized = value?.trim();
	return normalized ? normalized : null;
}

function normalizeIsbn(value: string | null): string | null {
	const normalized = value?.replace(/[\s-]/g, "").trim() ?? "";

	return normalized || null;
}

function normalizeTags(tags: string[]): string[] {
	return Array.from(
		new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
	).sort();
}
