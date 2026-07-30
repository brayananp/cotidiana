import { Clock01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import { Badge } from "@/shared/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import {
	Empty,
	EmptyDescription,
	EmptyTitle,
} from "@/shared/components/ui/empty";
import type { DailyReview } from "../../domain/daily-review";

export function ReviewHistory({ reviews }: { reviews: DailyReview[] }) {
	return (
		<Card className="flex flex-col p-4">
			<CardHeader className="p-0 pb-4">
				<CardTitle className="flex items-center gap-2 text-base font-semibold">
					<div className="flex size-7 items-center justify-center rounded-md bg-muted text-foreground">
						<HugeiconsIcon icon={Clock01Icon} size={15} />
					</div>
					<span>Revisiones recientes</span>
				</CardTitle>
				<CardDescription className="text-xs">
					Últimas evaluaciones personales guardadas.
				</CardDescription>
			</CardHeader>

			<CardContent className="p-0">
				{reviews.length === 0 ? (
					<Empty className="py-6 border border-dashed rounded-lg">
						<EmptyTitle className="text-xs text-muted-foreground">
							Todavía no hay revisiones registradas.
						</EmptyTitle>
						<EmptyDescription className="sr-only">
							Todavía no hay revisiones registradas.
						</EmptyDescription>
					</Empty>
				) : (
					<div className="">
						{reviews.map((review) => (
							<motion.article
								key={review.id}
								initial={{ opacity: 0, scale: 0.96 }}
								animate={{ opacity: 1, scale: 1 }}
								whileHover={{ y: -2 }}
								className="flex flex-col justify-between gap-2 rounded-lg border bg-card p-3 transition-shadow hover:shadow-xs"
							>
								<div className="flex items-center justify-between gap-2">
									<p className="font-semibold text-xs text-foreground">
										{formatDate(review.reviewDate)}
									</p>
									<Badge
										variant={review.completedAt ? "default" : "outline"}
										className="text-[10px] font-medium"
									>
										{review.completedAt ? "Completada" : "Borrador"}
									</Badge>
								</div>
								<p className="text-xs text-muted-foreground">
									Ánimo {review.mood}/5 · Energía {review.energy}/5 ·
									Productividad {review.productivity}/5
								</p>
							</motion.article>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function formatDate(value: string): string {
	const [year, month, day] = value.split("-").map(Number);
	return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(
		new Date(year, month - 1, day),
	);
}
