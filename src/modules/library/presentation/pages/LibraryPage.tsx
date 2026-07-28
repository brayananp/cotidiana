import { LibrarySyncBootstrap } from "#/platform/sync/LibrarySyncBootstrap";
import { LibrarySyncStatus } from "#/shared/components/LibrarySyncStatus";
import { ResponsiveDialog } from "#/shared/components/responsive-dialog";
import {
	Empty,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle,
} from "#/shared/components/ui/empty";
import { BooksIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
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
		<>
			<LibrarySyncStatus
				userId={identity.userId || access.remoteSession?.user.id}
			/>
			<LibrarySyncBootstrap access={access} />
			<LibraryContent userId={identity.userId} deviceId={identity.deviceId} />
		</>
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

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);

	const statuses = filter === "all" ? [] : [filter];

	const books = useBooks(userId, statuses, search);

	const selectedBook = books.find((book) => book.id === selectedBookId) ?? null;

	const context = {
		userId,
		deviceId,
	};

	return (
		<section className="flex flex-col gap-6">
			<header className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Biblioteca</h1>

					<p className="text-sm text-muted-foreground">
						Libros, progreso, notas e ideas disponibles offline.
					</p>
				</div>

				<Button
					onClick={() => {
						setEditingBook(null);
						setIsFormOpen(true);
					}}
				>
					Agregar libro
				</Button>
			</header>

			<ResponsiveDialog
				title={editingBook ? "Editar libro" : "Agregar libro"}
				description="El catálogo se guarda primero en este dispositivo."
				open={isFormOpen}
				onOpenChange={setIsFormOpen}
			>
				<BookForm
					key={editingBook?.id ?? "new-book"}
					context={context}
					book={editingBook}
					onCompleted={() => {
						setEditingBook(null);
						setIsFormOpen(false);
					}}
				/>
			</ResponsiveDialog>
			{selectedBook && (
				<ResponsiveDialog
					title="Detalles del libro"
					description="El catálogo se guarda primero en este dispositivo."
					open={isDetailsOpen}
					onOpenChange={setIsDetailsOpen}
				>
					<BookDetails book={selectedBook} context={context} />
				</ResponsiveDialog>
			)}

			<div className="flex flex-wrap gap-3">
				<Input
					type="search"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Buscar por título, autor, ISBN o etiqueta"
					className="min-w-64 flex-1"
				/>

				<Select
					value={filter}
					onValueChange={(value) => setFilter(value as LibraryFilter)}
				>
					<SelectTrigger className="w-fit">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todos</SelectItem>
						<SelectItem value="want_to_read">Quiero leer</SelectItem>
						<SelectItem value="reading">Leyendo</SelectItem>
						<SelectItem value="completed">Completados</SelectItem>
						<SelectItem value="paused">En pausa</SelectItem>
						<SelectItem value="dropped">Abandonados</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{books.length === 0 ? (
				<Empty>
					<EmptyTitle>No hay libros</EmptyTitle>
					<EmptyMedia variant="icon">
						<HugeiconsIcon icon={BooksIcon} className="size-10" />
					</EmptyMedia>
					<EmptyDescription>
						Agrega el primer libro de tu biblioteca.
					</EmptyDescription>
				</Empty>
			) : (
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
					{books.map((book) => (
						<BookCard
							key={book.id}
							book={book}
							selected={selectedBookId === book.id}
							onSelect={() => {
								setSelectedBookId(book.id);
								setIsFormOpen(false);
								setIsDetailsOpen(true);
							}}
							onEdit={() => {
								setEditingBook(book);
								setIsFormOpen(true);
							}}
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
		</section>
	);
}
