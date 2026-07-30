import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

export function MetricCard({
	label,
	value,
	detail,
	icon,
	progress,
	index = 0,
	children,
}: {
	label: string;
	value: string | number;
	detail?: string;
	icon?: HugeiconsIconProps["icon"];
	/** 0–100 — si se pasa, muestra una barra de progreso sutil */
	progress?: number;
	/** índice para stagger de animación */
	index?: number;
	children?: ReactNode;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.25, delay: index * 0.06, ease: "easeOut" }}
			className={cn(
				"group relative flex flex-col justify-between gap-3 rounded-2xl border bg-card p-4",
				"transition-shadow duration-200",
				// hover solo en dispositivos con puntero fino (no touch)
				"@media(hover:hover):hover:shadow-md",
			)}
		>
			{/* Top row: label + icon */}
			<div className="flex items-start justify-between gap-2">
				<span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
					{label}
				</span>
				{icon && (
					<div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
						<HugeiconsIcon icon={icon} size={14} />
					</div>
				)}
			</div>

			{/* Value — main metric */}
			<div className="flex flex-col gap-0.5">
				<p className="text-xl font-bold tracking-tight leading-none text-foreground sm:text-2xl">
					{value}
				</p>
				{detail && (
					<p className="mt-1 text-[11px] font-medium text-muted-foreground leading-tight">
						{detail}
					</p>
				)}
			</div>

			{/* Optional progress bar */}
			{progress !== undefined && (
				<div className="h-1 w-full overflow-hidden rounded-full bg-muted">
					<motion.div
						className="h-full rounded-full bg-primary/70"
						initial={{ width: 0 }}
						animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
						transition={{
							duration: 0.6,
							delay: index * 0.06 + 0.2,
							ease: "easeOut",
						}}
					/>
				</div>
			)}

			{children}
		</motion.div>
	);
}
