import { useState } from "react";
import type { LibraryExecutionContext } from "../../application/library-context";
import type { Book } from "../../domain/book";
import type { BookNote } from "../../domain/book-note";
import { libraryDependencies } from "../../infrastructure/library.dependencies";
import { useBookNotes } from "../hooks/use-book-notes";
import { bookNoteTypeLabels } from "../labels";
import { BookNoteForm } from "./BookNoteForm";

export function BookDetails({
	book,
	context,
}: {
	book: Book;
	context: LibraryExecutionContext;
}) {
	const notes = useBookNotes(context.userId, book.id);

	const [editingNote, setEditingNote] = useState<BookNote | null>(null);

	const [progress, setProgress] = useState(book.currentPage);

	return (
		<section className="space-y-5 rounded-xl border p-4">
			<header>
				<h2 className="text-xl font-semibold">{book.title}</h2>

				<p className="text-sm text-muted-foreground">
					{book.author ?? "Autor no indicado"}
				</p>
			</header>

			{book.description && <p className="text-sm">{book.description}</p>}

			<div className="space-y-2 rounded-lg border p-3">
				<h3 className="font-medium">Progreso</h3>

				<div className="flex flex-wrap items-center gap-2">
					<input
						type="number"
						min={0}
						max={book.pageCount ?? undefined}
						value={progress}
						onChange={(event) => setProgress(Number(event.target.value))}
						className="h-10 w-28 rounded-md border px-3"
					/>

					{book.pageCount !== null && (
						<span className="text-sm text-muted-foreground">
							de {book.pageCount}
						</span>
					)}

					<button
						type="button"
						className="h-10 rounded-md border px-3 text-sm"
						onClick={() =>
							void libraryDependencies.updateBookProgress(
								book.id,
								progress,
								context,
							)
						}
					>
						Actualizar progreso
					</button>
				</div>
			</div>

			<BookNoteForm
				key={editingNote?.id ?? `new-note-${book.id}`}
				bookId={book.id}
				context={context}
				note={editingNote}
				onCompleted={() => setEditingNote(null)}
			/>

			<div className="space-y-3">
				<h3 className="font-medium">Notas y citas</h3>

				{notes.length === 0 ? (
					<p className="text-sm text-muted-foreground">Aún no hay notas.</p>
				) : (
					notes.map((note) => (
						<article key={note.id} className="space-y-2 rounded-lg border p-3">
							<div className="flex items-center justify-between gap-3">
								<span className="rounded-full border px-2 py-1 text-xs">
									{bookNoteTypeLabels[note.type]}
								</span>

								{note.page !== null && (
									<span className="text-xs text-muted-foreground">
										Página {note.page}
									</span>
								)}
							</div>

							<p className="whitespace-pre-wrap text-sm">{note.content}</p>

							<div className="flex gap-2">
								<button
									type="button"
									className="rounded-md border px-2 py-1 text-xs"
									onClick={() => setEditingNote(note)}
								>
									Editar
								</button>

								<button
									type="button"
									className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive"
									onClick={() => {
										if (window.confirm("¿Eliminar esta nota?")) {
											void libraryDependencies.deleteNote(note.id, context);
										}
									}}
								>
									Eliminar
								</button>
							</div>
						</article>
					))
				)}
			</div>
		</section>
	);
}
