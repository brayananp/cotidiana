export const BOOK_NOTE_TYPES = ["note", "quote", "idea"] as const;

export type BookNoteType = (typeof BOOK_NOTE_TYPES)[number];

export type BookNote = {
	id: string;
	userId: string;
	bookId: string;
	type: BookNoteType;
	content: string;
	page: number | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	version: number;
};

export type CreateBookNoteEntityInput = {
	userId: string;
	bookId: string;
	type: BookNoteType;
	content: string;
	page: number | null;
};

export type UpdateBookNoteEntityInput = Omit<
	CreateBookNoteEntityInput,
	"userId" | "bookId"
>;

export function createBookNoteEntity(
	input: CreateBookNoteEntityInput,
	now = new Date(),
): BookNote {
	assertPage(input.page);
	const timestamp = now.toISOString();

	return {
		id: crypto.randomUUID(),
		userId: input.userId,
		bookId: input.bookId,
		type: input.type,
		content: normalizeContent(input.content),
		page: input.page,
		createdAt: timestamp,
		updatedAt: timestamp,
		deletedAt: null,
		version: 1,
	};
}

export function updateBookNoteEntity(
	note: BookNote,
	input: UpdateBookNoteEntityInput,
	now = new Date(),
): BookNote {
	assertEditable(note);
	assertPage(input.page);

	return {
		...note,
		type: input.type,
		content: normalizeContent(input.content),
		page: input.page,
		updatedAt: now.toISOString(),
		version: note.version + 1,
	};
}

export function deleteBookNoteEntity(
	note: BookNote,
	now = new Date(),
): BookNote {
	assertEditable(note);

	return {
		...note,
		deletedAt: now.toISOString(),
		updatedAt: now.toISOString(),
		version: note.version + 1,
	};
}

export function assertBookNoteOwnership(note: BookNote, userId: string): void {
	if (note.userId !== userId) {
		throw new Error("BOOK_NOTE_FORBIDDEN");
	}
}

function assertPage(page: number | null): void {
	if (page !== null && (!Number.isInteger(page) || page < 1)) {
		throw new Error("INVALID_BOOK_NOTE_PAGE");
	}
}

function assertEditable(note: BookNote): void {
	if (note.deletedAt) {
		throw new Error("BOOK_NOTE_ALREADY_DELETED");
	}
}

function normalizeContent(value: string): string {
	const normalized = value.trim();

	if (!normalized) {
		throw new Error("BOOK_NOTE_CONTENT_REQUIRED");
	}

	return normalized;
}
