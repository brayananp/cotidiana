import { useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import type { Book, BookStatus } from "../../domain/book";
import { libraryDependencies } from "../../infrastructure/library.dependencies";
import { BookCard } from "../components/BookCard";
import { BookDetails } from "../components/BookDetails";
import { BookForm } from "../components/BookForm";
import { useBooks } from "../hooks/use-books";

type LibraryFilter = "all" | BookStatus;

export function LibraryPage() {
	const { access } = useRouteContext({
		from: "/_app",
	});

	const identity = access.localIdentity;

	if (!identity) {
		return <p>El dispositivo no tiene una identidad local activa.</p>;
	}

	return (
		<LibraryContent userId={identity.userId} deviceId={identity.deviceId} />
	);
}

function LibraryContent({
	userId,
	deviceId,
}: {
	userId: string;
	deviceId: string;
}) {
	const [filter, setFilter] = useState<LibraryFilter>("all");

	const [search, setSearch] = useState("");

	const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

	const [editingBook, setEditingBook] = useState<Book | null>(null);

	const statuses = filter === "all" ? [] : [filter];

	const books = useBooks(userId, statuses, search);

	const selectedBook = books.find((book) => book.id === selectedBookId) ?? null;

	const context = {
		userId,
		deviceId,
	};

	return (
		<section className="space-y-6">
			<header>
				<h1 className="text-2xl font-semibold">Biblioteca</h1>

				<p className="text-sm text-muted-foreground">
					Libros, progreso, notas e ideas disponibles offline.
				</p>
			</header>

			<BookForm
				key={editingBook?.id ?? "new-book"}
				context={context}
				book={editingBook}
				onCompleted={() => setEditingBook(null)}
			/>

			<div className="flex flex-wrap gap-3">
				<input
					type="search"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Buscar por título, autor, ISBN o etiqueta"
					className="h-10 min-w-64 flex-1 rounded-md border px-3"
				/>

				<select
					value={filter}
					onChange={(event) => setFilter(event.target.value as LibraryFilter)}
					className="h-10 rounded-md border px-3"
				>
					<option value="all">Todos</option>
					<option value="want_to_read">Quiero leer</option>
					<option value="reading">Leyendo</option>
					<option value="completed">Completados</option>
					<option value="paused">En pausa</option>
					<option value="dropped">Abandonados</option>
				</select>
			</div>

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
				<div>
					{books.length === 0 ? (
						<div className="rounded-xl border border-dashed p-8 text-center">
							<h2 className="font-medium">No hay libros</h2>

							<p className="text-sm text-muted-foreground">
								Agrega el primer libro de tu biblioteca.
							</p>
						</div>
					) : (
						<div className="grid gap-3 md:grid-cols-2">
							{books.map((book) => (
								<BookCard
									key={book.id}
									book={book}
									selected={selectedBookId === book.id}
									onSelect={() => setSelectedBookId(book.id)}
									onEdit={() => setEditingBook(book)}
									onDelete={() => {
										if (window.confirm("¿Eliminar el libro y sus notas?")) {
											void libraryDependencies.deleteBook(book.id, context);

											if (selectedBookId === book.id) {
												setSelectedBookId(null);
											}
										}
									}}
								/>
							))}
						</div>
					)}
				</div>

				<div>
					{selectedBook ? (
						<BookDetails
							key={`${selectedBook.id}:${selectedBook.version}`}
							book={selectedBook}
							context={context}
						/>
					) : (
						<div className="rounded-xl border border-dashed p-8 text-center">
							<p className="text-sm text-muted-foreground">
								Selecciona un libro para ver su progreso y notas.
							</p>
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
