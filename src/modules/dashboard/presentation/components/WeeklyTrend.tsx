import { ChartBarLineIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import type { DashboardDayPoint } from "../../domain/dashboard-metrics";

const BAR_HEIGHT = 52; // px — área máxima para la barra

export function WeeklyTrend({ points }: { points: DashboardDayPoint[] }) {
	const max = Math.max(
		1,
		...points.map((p) => p.completedTasks + p.completedBlocks),
	);

	return (
		<Card className="p-4">
			<CardHeader className="p-0 pb-3">
				<CardTitle className="flex items-center gap-2 text-sm font-semibold">
					<div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
						<HugeiconsIcon icon={ChartBarLineIcon} size={13} />
					</div>
					<span>Tendencia de 7 días</span>
				</CardTitle>
			</CardHeader>

			<CardContent className="p-0">
				<TooltipProvider>
					{/* Contenedor de barras con baseline compartida */}
					<div
						className="relative flex items-end gap-1 min-h-[100px]"
						role="img"
						aria-label="Actividad de los últimos siete días"
						style={{ height: BAR_HEIGHT + 32 }} /* barras + labels */
					>
						{/* Línea de base */}
						<div className="absolute bottom-[22px] left-0 right-0 h-px bg-border" />

						{points.map((point) => {
							const activity = point.completedTasks + point.completedBlocks;
							const barPx =
								activity > 0
									? Math.max(6, Math.round((activity / max) * BAR_HEIGHT))
									: 0;

							return (
								<Tooltip key={point.date}>
									<TooltipTrigger
										render={
											<div className="group flex flex-1 cursor-pointer flex-col items-center gap-0">
												{/* Número de actividades encima */}
												<span
													className="text-[10px] font-bold text-primary leading-none mb-1"
													style={{ minHeight: 14 }}
												>
													{activity > 0 ? activity : ""}
												</span>

												{/* Barra — solo la barra, sin caja de fondo */}
												<div
													className="relative flex w-full items-end justify-center"
													style={{ height: BAR_HEIGHT }}
												>
													{barPx > 0 ? (
														<motion.div
															initial={{ height: 0 }}
															animate={{ height: barPx }}
															transition={{
																duration: 0.45,
																ease: "easeOut",
																delay: 0.04,
															}}
															className="w-full rounded-t-sm bg-primary/80 transition-colors group-hover:bg-primary"
														/>
													) : (
														/* Punto vacío en la línea de base */
														<div className="mb-0 size-1.5 rounded-full bg-muted-foreground/30 group-hover:bg-muted-foreground/60 transition-colors" />
													)}
												</div>

												{/* Etiqueta del día */}
												<span className="mt-1.5 block text-[10px] capitalize text-muted-foreground group-hover:text-foreground transition-colors leading-none">
													{point.label}
												</span>
											</div>
										}
									/>
									<TooltipContent side="top" className="text-xs">
										<p className="font-semibold capitalize">{point.date}</p>
										<p>
											{activity} actividades · {point.focusMinutes} min de
											enfoque
										</p>
									</TooltipContent>
								</Tooltip>
							);
						})}
					</div>
				</TooltipProvider>
			</CardContent>
		</Card>
	);
}
