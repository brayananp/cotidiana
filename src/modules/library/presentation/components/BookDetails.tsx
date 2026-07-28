import { ResponsiveDialog } from "#/shared/components/responsive-dialog";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
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
	const [isOpenFormNote, setIsOpenFormNote] = useState(false);
	return (
		<Card>
			<CardHeader>
				<CardTitle>{book.title}</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-5">
				<p className="text-sm text-muted-foreground">
					{book.author ?? "Autor no indicado"}
				</p>

				{book.description && <p className="text-sm">{book.description}</p>}
				<Button onClick={() => setIsOpenFormNote(true)}>Agregar nota</Button>
				<div className="flex flex-col gap-2 rounded-lg border p-3">
					<h3 className="font-medium">Progreso</h3>

					<div className="flex flex-wrap items-center gap-2">
						<Input
							type="number"
							min={0}
							max={book.pageCount ?? undefined}
							value={progress}
							onChange={(event) => setProgress(Number(event.target.value))}
							className="w-28"
						/>

						{book.pageCount !== null && (
							<span className="text-sm text-muted-foreground">
								de {book.pageCount}
							</span>
						)}

						<Button
							size="sm"
							onClick={() =>
								void libraryDependencies.updateBookProgress(
									book.id,
									progress,
									context,
								)
							}
						>
							Actualizar progreso
						</Button>
					</div>
				</div>

				<ResponsiveDialog
					title="Agregar nota"
					description="Agrega una nota para este libro."
					open={isOpenFormNote}
					onOpenChange={setIsOpenFormNote}
				>
					<BookNoteForm
						key={editingNote?.id ?? `new-note-${book.id}`}
						bookId={book.id}
						context={context}
						note={editingNote}
						onCompleted={() => setEditingNote(null)}
						onCancel={() => setIsOpenFormNote(false)}
					/>
				</ResponsiveDialog>
				{/* <BookNoteForm
					key={editingNote?.id ?? `new-note-${book.id}`}
					bookId={book.id}
					context={context}
					note={editingNote}
					onCompleted={() => setEditingNote(null)}
				/> */}

				<div className="flex flex-col gap-3">
					<h3 className="font-medium">Notas y citas</h3>

					{notes.length === 0 ? (
						<p className="text-sm text-muted-foreground">Aún no hay notas.</p>
					) : (
						notes.map((note) => (
							<Card key={note.id} size="sm">
								<CardContent className="flex flex-col gap-2 p-3">
									<div className="flex items-center justify-between gap-3">
										<Badge variant="outline">
											{bookNoteTypeLabels[note.type]}
										</Badge>

										{note.page !== null && (
											<span className="text-xs text-muted-foreground">
												Página {note.page}
											</span>
										)}
									</div>

									<p className="whitespace-pre-wrap text-sm">{note.content}</p>

									<div className="flex gap-2">
										<Button
											variant="outline"
											size="xs"
											onClick={() => setEditingNote(note)}
										>
											Editar
										</Button>

										<Button
											variant="destructive"
											size="xs"
											onClick={() => {
												if (window.confirm("¿Eliminar esta nota?")) {
													void libraryDependencies.deleteNote(note.id, context);
												}
											}}
										>
											Eliminar
										</Button>
									</div>
								</CardContent>
							</Card>
						))
					)}
				</div>
			</CardContent>
		</Card>
	);
}
