import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

const metricKeys = ["metric-1", "metric-2", "metric-3", "metric-4"];
const listKeys = ["list-1", "list-2", "list-3"];
const trendKeys = [
	"bar-1",
	"bar-2",
	"bar-3",
	"bar-4",
	"bar-5",
	"bar-6",
	"bar-7",
];

export function DashboardSkeleton() {
	return (
		<div className="flex flex-col gap-6" aria-busy="true">
			{/* Header Skeleton */}
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div className="flex flex-col gap-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-8 w-60" />
					<Skeleton className="h-4 w-80" />
				</div>
				<Skeleton className="h-9 w-40 rounded-lg" />
			</header>

			{/* 4 Metric Cards */}
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{metricKeys.map((key) => (
					<Card key={key} className="p-4">
						<div className="flex items-center justify-between">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="size-8 rounded-lg" />
						</div>
						<Skeleton className="mt-3 h-7 w-20" />
						<Skeleton className="mt-2 h-3.5 w-36" />
					</Card>
				))}
			</div>

			{/* 3 Dashboard Lists */}
			<div className="grid gap-4 xl:grid-cols-3">
				{listKeys.map((key) => (
					<Card key={key} className="p-4">
						<CardHeader className="p-0 pb-3">
							<div className="flex items-center justify-between">
								<Skeleton className="h-5 w-28" />
								<Skeleton className="h-4 w-14" />
							</div>
						</CardHeader>
						<CardContent className="flex flex-col gap-2 p-0">
							<Skeleton className="h-16 w-full rounded-md" />
							<Skeleton className="h-16 w-full rounded-md" />
						</CardContent>
					</Card>
				))}
			</div>

			{/* Weekly Trend & Form */}
			<div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
				<Card className="p-4">
					<Skeleton className="h-5 w-36" />
					<Skeleton className="mt-1 h-4 w-64" />
					<div className="mt-6 flex h-28 items-end gap-3">
						{trendKeys.map((key) => (
							<Skeleton key={key} className="h-full flex-1 rounded-sm" />
						))}
					</div>
				</Card>

				<Card className="p-4">
					<Skeleton className="h-5 w-32" />
					<Skeleton className="mt-1 h-4 w-52" />
					<div className="mt-4 flex flex-col gap-3">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-20 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				</Card>
			</div>
		</div>
	);
}
