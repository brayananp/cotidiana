import type { DailyReview } from "../../domain/daily-review";

export function ReviewHistory({ reviews }: { reviews: DailyReview[] }) {
	return (
		<section className="space-y-3 rounded-xl border p-4">
			<div>
				<h2 className="font-semibold">Revisiones recientes</h2>
				<p className="text-sm text-muted-foreground">
					Últimas evaluaciones personales guardadas.
				</p>
			</div>

			{reviews.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					Todavía no hay revisiones.
				</p>
			) : (
				<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{reviews.map((review) => (
						<article key={review.id} className="rounded-lg border p-3">
							<p className="font-medium">{formatDate(review.reviewDate)}</p>
							<p className="mt-1 text-xs text-muted-foreground">
								Ánimo {review.mood}/5 · Energía {review.energy}/5 ·
								Productividad {review.productivity}/5
							</p>
							<p className="mt-2 text-xs">
								{review.completedAt ? "Completada" : "Borrador"}
							</p>
						</article>
					))}
				</div>
			)}
		</section>
	);
}

function formatDate(value: string): string {
	const [year, month, day] = value.split("-").map(Number);
	return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(
		new Date(year, month - 1, day),
	);
}
