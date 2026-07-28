import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
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
		<Card className={selected ? "border-primary" : ""} size="sm">
			<Button
				variant="ghost"
				className="w-full justify-start px-0"
				onClick={onSelect}
			>
				<div className="flex gap-3">
					{book.coverUrl ? (
						<img
							src={book.coverUrl}
							alt=""
							className="h-24 w-16 rounded-lg object-cover"
						/>
					) : (
						<div className="flex h-24 w-16 items-center justify-center rounded-lg border text-xs text-muted-foreground">
							Sin portada
						</div>
					)}

					<div className="min-w-0 flex-1">
						<h3 className="font-medium">{book.title}</h3>

						<p className="text-sm text-muted-foreground">
							{book.author ?? "Autor no indicado"}
						</p>

						<Badge variant="outline" className="mt-2">
							{bookStatusLabels[book.status]}
						</Badge>
					</div>
				</div>
			</Button>

			{progress !== null && (
				<div className="flex flex-col gap-1">
					<Progress value={progress} />

					<p className="text-xs text-muted-foreground">
						{book.currentPage}/{book.pageCount} páginas · {progress}%
					</p>
				</div>
			)}

			{book.tags.length > 0 && (
				<div className="flex flex-wrap gap-1">
					{book.tags.map((tag) => (
						<Badge key={tag} variant="secondary">
							{tag}
						</Badge>
					))}
				</div>
			)}

			<div className="flex gap-2">
				<Button variant="outline" size="xs" onClick={onEdit}>
					Editar
				</Button>

				<Button variant="destructive" size="xs" onClick={onDelete}>
					Eliminar
				</Button>
			</div>
		</Card>
	);
}
