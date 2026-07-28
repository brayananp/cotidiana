import { useRouteContext } from "@tanstack/react-router";
import { localDateKey } from "../../domain/daily-review";
import { DailyReviewForm } from "../components/DailyReviewForm";
import { DashboardLists } from "../components/DashboardLists";
import { MetricCard } from "../components/MetricCard";
import { ReviewHistory } from "../components/ReviewHistory";
import { WeeklyTrend } from "../components/WeeklyTrend";
import {
	useDailyReview,
	useDailyReviewHistory,
} from "../hooks/use-daily-reviews";
import { useDashboard } from "../hooks/use-dashboard";

export function DashboardPage() {
	const { access } = useRouteContext({ from: "/_app" });
	const identity = access.localIdentity;

	if (!identity) return <p>No hay una identidad local activa.</p>;

	const name = access.remoteSession?.user.name ?? identity.name ?? "Usuario";
	return (
		<DashboardContent
			name={name}
			userId={identity.userId}
			deviceId={identity.deviceId}
		/>
	);
}

function DashboardContent({
	name,
	userId,
	deviceId,
}: {
	name: string;
	userId: string;
	deviceId: string;
}) {
	const reviewDate = localDateKey();
	const metrics = useDashboard(userId);
	const review = useDailyReview(userId, reviewDate);
	const history = useDailyReviewHistory(userId, 6);

	if (!metrics) return <p>Cargando dashboard local…</p>;

	return (
		<section className="space-y-6">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="text-sm text-muted-foreground">
						{greeting()}, {name}
					</p>
					<h1 className="text-3xl font-semibold">Tu día en una vista</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Métricas calculadas desde los datos locales de este dispositivo.
					</p>
				</div>
				<div className="rounded-lg border px-3 py-2 text-sm">
					Racha actual: <strong>{metrics.streak.current} día(s)</strong>
				</div>
			</header>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<MetricCard
					label="Tareas de hoy"
					value={`${metrics.today.completedTasks}/${metrics.today.completedTasks + metrics.today.plannedTasks}`}
					detail={`${metrics.today.taskCompletionRate}% completado · ${metrics.today.overdueTasks} vencidas`}
				/>
				<MetricCard
					label="Enfoque hoy"
					value={`${metrics.today.focusMinutes} min`}
					detail={`${metrics.today.completedMinutes}/${metrics.today.plannedMinutes} min completados`}
				/>
				<MetricCard
					label="Semana productiva"
					value={`${metrics.week.productiveDays}/7 días`}
					detail={`${metrics.week.completedTasks} tareas · ${metrics.week.focusMinutes} min enfoque`}
				/>
				<MetricCard
					label="Lectura activa"
					value={metrics.library.reading}
					detail={
						metrics.library.averageProgress === null
							? `${metrics.library.completed} libros completados`
							: `${metrics.library.averageProgress}% de progreso medio`
					}
				/>
			</div>

			<DashboardLists metrics={metrics} />

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
				<WeeklyTrend points={metrics.week.points} />
				<DailyReviewForm
					reviewDate={reviewDate}
					review={review}
					context={{ userId, deviceId }}
				/>
			</div>

			<ReviewHistory reviews={history} />
		</section>
	);
}

function greeting(): string {
	const hour = new Date().getHours();
	if (hour < 12) return "Buenos días";
	if (hour < 19) return "Buenas tardes";
	return "Buenas noches";
}
