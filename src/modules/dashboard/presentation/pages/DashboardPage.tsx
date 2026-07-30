import {
	BookOpen01Icon,
	CheckmarkCircle02Icon,
	Clock01Icon,
	FireIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouteContext } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Badge } from "@/shared/components/ui/badge";
import { localDateKey } from "../../domain/daily-review";
import { DailyReviewForm } from "../components/DailyReviewForm";
import { DashboardLists } from "../components/DashboardLists";
import { DashboardSkeleton } from "../components/DashboardSkeleton";
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

	if (!identity) {
		return <DashboardSkeleton />;
	}

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

	if (!metrics) return <DashboardSkeleton />;

	return (
		<motion.section
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className="flex flex-col gap-5"
		>
			{/* ── Header ── */}
			<header className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						{greeting()}, {name}
					</p>
					<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
						Tu día en una vista
					</h1>
					<p className="mt-0.5 text-xs text-muted-foreground">
						Métricas calculadas desde los datos locales de este dispositivo.
					</p>
				</div>
				<Badge
					variant="outline"
					className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
				>
					<HugeiconsIcon icon={FireIcon} size={14} className="text-amber-500" />
					<span>Racha: {metrics.streak.current} día(s)</span>
				</Badge>
			</header>

			{/* ── Metric cards — 2 cols mobile · 4 cols xl ── */}
			<div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
				<MetricCard
					label="Tareas de hoy"
					value={`${metrics.today.completedTasks}/${metrics.today.completedTasks + metrics.today.plannedTasks}`}
					detail={`${metrics.today.taskCompletionRate}% · ${metrics.today.overdueTasks} vencidas`}
					icon={CheckmarkCircle02Icon}
				/>
				<MetricCard
					label="Enfoque hoy"
					value={`${metrics.today.focusMinutes} min`}
					detail={`${metrics.today.completedMinutes}/${metrics.today.plannedMinutes} min`}
					icon={Clock01Icon}
				/>
				<MetricCard
					label="Semana productiva"
					value={`${metrics.week.productiveDays}/7 días`}
					detail={`${metrics.week.completedTasks} tareas · ${metrics.week.focusMinutes} min`}
					icon={FireIcon}
				/>
				<MetricCard
					label="Lectura activa"
					value={metrics.library.reading}
					detail={
						metrics.library.averageProgress === null
							? `${metrics.library.completed} completados`
							: `${metrics.library.averageProgress}% progreso medio`
					}
					icon={BookOpen01Icon}
				/>
			</div>

			{/* ── Main body: 3-column grid on large screens ── */}
			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,0.85fr)]">
				{/* Col 1 — Listas de actividades */}
				<div className="flex flex-col gap-4">
					<DashboardLists metrics={metrics} />
				</div>

				{/* Col 2 — Tendencia + Historial */}
				<div className="flex flex-col gap-4">
					<WeeklyTrend points={metrics.week.points} />
					<ReviewHistory reviews={history} />
				</div>

				{/* Col 3 — Revisión diaria (se ancla a la altura natural) */}
				<div className="lg:sticky lg:top-4 lg:self-start">
					<DailyReviewForm
						reviewDate={reviewDate}
						review={review}
						context={{ userId, deviceId }}
					/>
				</div>
			</div>
		</motion.section>
	);
}

function greeting(): string {
	const hour = new Date().getHours();
	if (hour < 12) return "Buenos días";
	if (hour < 19) return "Buenas tardes";
	return "Buenas noches";
}
