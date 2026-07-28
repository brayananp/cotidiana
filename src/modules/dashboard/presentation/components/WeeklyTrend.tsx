import type { DashboardDayPoint } from "../../domain/dashboard-metrics";

export function WeeklyTrend({ points }: { points: DashboardDayPoint[] }) {
	const max = Math.max(
		1,
		...points.map((point) => point.completedTasks + point.completedBlocks),
	);

	return (
		<section className="space-y-4 rounded-xl border p-4">
			<div>
				<h2 className="font-semibold">Tendencia de 7 días</h2>
				<p className="text-sm text-muted-foreground">
					Actividad completada y minutos de enfoque calculados localmente.
				</p>
			</div>

			<div
				className="grid grid-cols-7 gap-2"
				role="img"
				aria-label="Actividad de los últimos siete días"
			>
				{points.map((point) => {
					const activity = point.completedTasks + point.completedBlocks;
					const height = Math.max(8, Math.round((activity / max) * 96));

					return (
						<div
							key={point.date}
							className="flex min-w-0 flex-col items-center gap-2"
						>
							<div className="flex h-28 w-full items-end justify-center rounded-md bg-muted p-1">
								<div
									className="w-full rounded-sm bg-primary"
									style={{ height }}
									title={`${activity} actividades · ${point.focusMinutes} min de enfoque`}
								/>
							</div>
							<span className="text-xs capitalize text-muted-foreground">
								{point.label}
							</span>
							<span className="text-xs font-medium">{activity}</span>
						</div>
					);
				})}
			</div>
		</section>
	);
}
