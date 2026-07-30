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

// ── Motion variants ────────────────────────────────────────────────────────
const pageVariants = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: {
			staggerChildren: 0.07,
			delayChildren: 0.05,
		},
	},
};

const sectionVariants = {
	hidden: { opacity: 0, y: 10 },
	show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

// ──────────────────────────────────────────────────────────────────────────

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

	const taskProgress =
		metrics.today.completedTasks + metrics.today.plannedTasks > 0
			? Math.round(
					(metrics.today.completedTasks /
						(metrics.today.completedTasks + metrics.today.plannedTasks)) *
						100,
				)
			: undefined;

	return (
		<motion.section
			variants={pageVariants}
			initial="hidden"
			animate="show"
			className="flex flex-col gap-5"
		>
			{/* ── Header ── */}
			<motion.header
				variants={{ sectionVariants }}
				className="flex flex-wrap items-end justify-between gap-3"
			>
				<div>
					<p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
						{greeting()}, {name}
					</p>
					<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
						Tu día en una vista
					</h1>
					<p className="mt-0.5 text-[11px] text-muted-foreground">
						Métricas calculadas desde los datos locales de este dispositivo.
					</p>
				</div>
				<Badge
					variant="outline"
					className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
				>
					<HugeiconsIcon icon={FireIcon} size={13} className="text-amber-500" />
					<span>Racha: {metrics.streak.current} día(s)</span>
				</Badge>
			</motion.header>

			{/* ── Metric cards ── */}
			<motion.div
				variants={{ sectionVariants }}
				className="grid grid-cols-2 gap-3 xl:grid-cols-4"
			>
				<MetricCard
					index={0}
					label="Tareas de hoy"
					value={`${metrics.today.completedTasks}/${metrics.today.completedTasks + metrics.today.plannedTasks}`}
					detail={`${metrics.today.taskCompletionRate}% · ${metrics.today.overdueTasks} vencidas`}
					icon={CheckmarkCircle02Icon}
					progress={taskProgress}
				/>
				<MetricCard
					index={1}
					label="Enfoque hoy"
					value={`${metrics.today.focusMinutes} min`}
					detail={`${metrics.today.completedMinutes} / ${metrics.today.plannedMinutes} min`}
					icon={Clock01Icon}
				/>
				<MetricCard
					index={2}
					label="Semana"
					value={`${metrics.week.productiveDays}/7`}
					detail={`${metrics.week.completedTasks} tareas · ${metrics.week.focusMinutes} min`}
					icon={FireIcon}
				/>
				<MetricCard
					index={3}
					label="Lectura activa"
					value={metrics.library.reading}
					detail={
						metrics.library.averageProgress === null
							? `${metrics.library.completed} completados`
							: `${metrics.library.averageProgress}% progreso`
					}
					icon={BookOpen01Icon}
				/>
			</motion.div>

			{/* ── Main body: 3-column grid on large screens ── */}
			<motion.div
				variants={{ sectionVariants }}
				className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(300px,0.8fr)]"
			>
				{/* Col 1 — Listas (mobile: order-2) */}
				<div className="flex flex-col gap-4 order-2 lg:order-1">
					<DashboardLists metrics={metrics} />
				</div>

				{/* Col 2 — Tendencia + Historial (mobile: order-3) */}
				<div className="flex flex-col gap-4 order-3 lg:order-2">
					<WeeklyTrend points={metrics.week.points} />
					<ReviewHistory reviews={history} />
				</div>

				{/* Col 3 — Revisión diaria (mobile: order-1, prioridad en mobile) */}
				<div className="order-1 lg:order-3 lg:sticky lg:top-4 lg:self-start">
					<DailyReviewForm
						reviewDate={reviewDate}
						review={review}
						context={{ userId, deviceId }}
					/>
				</div>
			</motion.div>
		</motion.section>
	);
}

function greeting(): string {
	const hour = new Date().getHours();
	if (hour < 12) return "Buenos días";
	if (hour < 19) return "Buenas tardes";
	return "Buenas noches";
}
