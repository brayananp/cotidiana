import type { Book } from "../../domain/book";
import { calculateBookProgress } from "../../domain/book";
import { bookStatusLabels } from "../labels";

export function BookCard({
	book,
	selected,
	onSelect,
	onEdit,
	onDelete,
}: {
	book: Book;
	selected: boolean;
	onSelect: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const progress = calculateBookProgress(book);

	return (
		<article
			className={
				selected
					? "space-y-3 rounded-xl border border-primary p-4"
					: "space-y-3 rounded-xl border p-4"
			}
		>
			<button type="button" className="w-full text-left" onClick={onSelect}>
				<div className="flex gap-3">
					{book.coverUrl ? (
						<img
							src={book.coverUrl}
							alt=""
							className="h-24 w-16 rounded object-cover"
						/>
					) : (
						<div className="flex h-24 w-16 items-center justify-center rounded border text-xs text-muted-foreground">
							Sin portada
						</div>
					)}

					<div className="min-w-0 flex-1">
						<h3 className="font-medium">{book.title}</h3>

						<p className="text-sm text-muted-foreground">
							{book.author ?? "Autor no indicado"}
						</p>

						<span className="mt-2 inline-block rounded-full border px-2 py-1 text-xs">
							{bookStatusLabels[book.status]}
						</span>
					</div>
				</div>
			</button>

			{progress !== null && (
				<div className="space-y-1">
					<div className="h-2 overflow-hidden rounded-full bg-muted">
						<div
							className="h-full bg-primary"
							style={{
								width: `${progress}%`,
							}}
						/>
					</div>

					<p className="text-xs text-muted-foreground">
						{book.currentPage}/{book.pageCount} páginas · {progress}%
					</p>
				</div>
			)}

			{book.tags.length > 0 && (
				<div className="flex flex-wrap gap-1">
					{book.tags.map((tag) => (
						<span key={tag} className="rounded-full bg-muted px-2 py-1 text-xs">
							{tag}
						</span>
					))}
				</div>
			)}

			<div className="flex gap-2">
				<button
					type="button"
					className="rounded-md border px-2 py-1 text-xs"
					onClick={onEdit}
				>
					Editar
				</button>

				<button
					type="button"
					className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive"
					onClick={onDelete}
				>
					Eliminar
				</button>
			</div>
		</article>
	);
}
