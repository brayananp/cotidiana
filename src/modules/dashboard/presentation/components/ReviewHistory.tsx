import { CalendarCheckIn01Icon } from "@hugeicons/core-free-icons";
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
import { Separator } from "@/shared/components/ui/separator";
import type { DailyReview } from "../../domain/daily-review";

export function ReviewHistory({ reviews }: { reviews: DailyReview[] }) {
	return (
		<Card className="flex flex-col p-4">
			<CardHeader className="p-0 pb-3">
				<CardTitle className="flex items-center gap-2 text-sm font-semibold">
					<div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
						<HugeiconsIcon icon={CalendarCheckIn01Icon} size={13} />
					</div>
					<span>Revisiones recientes</span>
				</CardTitle>
				<CardDescription className="text-[11px]">
					Últimas evaluaciones personales guardadas.
				</CardDescription>
			</CardHeader>

			<CardContent className="p-0">
				{reviews.length === 0 ? (
					<Empty className="py-6 border border-dashed rounded-xl">
						<EmptyTitle className="text-xs text-muted-foreground">
							Todavía no hay revisiones registradas.
						</EmptyTitle>
						<EmptyDescription className="sr-only">
							Todavía no hay revisiones registradas.
						</EmptyDescription>
					</Empty>
				) : (
					<div className="flex flex-col">
						{reviews.map((review, i) => (
							<motion.article
								key={review.id}
								initial={{ opacity: 0, y: 4 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.2, delay: i * 0.05, ease: "easeOut" }}
								className="flex flex-col gap-2 py-2.5 transition-colors hover:bg-muted/40 rounded-lg px-2 -mx-2"
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

								{/* Score dots visualization */}
								<div className="flex items-center gap-3">
									<ScoreDots label="Ánimo" score={review.mood} />
									<ScoreDots label="Energía" score={review.energy} />
									<ScoreDots label="Prod." score={review.productivity} />
								</div>

								{i < reviews.length - 1 && (
									<Separator className="mt-1 opacity-50" />
								)}
							</motion.article>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

/** Mini visualizador de score 1–5 con dots de color */
function ScoreDots({ label, score }: { label: string; score: number }) {
	return (
		<div className="flex items-center gap-1">
			<span className="text-[10px] text-muted-foreground leading-none w-8 shrink-0">
				{label}
			</span>
			<div className="flex items-center gap-0.5">
				{[1, 2, 3, 4, 5].map((dot) => (
					<div
						key={dot}
						className={`size-1.5 rounded-full transition-colors ${
							dot <= score
								? score >= 4
									? "bg-primary"
									: score >= 3
										? "bg-amber-400"
										: "bg-destructive/70"
								: "bg-muted-foreground/20"
						}`}
					/>
				))}
			</div>
		</div>
	);
}

function formatDate(value: string): string {
	const [year, month, day] = value.split("-").map(Number);
	return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(
		new Date(year, month - 1, day),
	);
}
