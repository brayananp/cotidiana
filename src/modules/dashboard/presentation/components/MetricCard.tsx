import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Card } from "@/shared/components/ui/card";

export function MetricCard({
	label,
	value,
	detail,
	icon,
	children,
}: {
	label: string;
	value: string | number;
	detail?: string;
	icon?: HugeiconsIconProps["icon"];
	children?: ReactNode;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			whileHover={{ y: -2 }}
			transition={{ duration: 0.2 }}
		>
			<Card className="flex flex-col justify-between p-4 transition-shadow hover:shadow-sm">
				<div>
					<div className="flex items-center justify-between gap-2">
						<span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							{label}
						</span>
						{icon && (
							<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
								<HugeiconsIcon icon={icon} size={16} />
							</div>
						)}
					</div>
					<p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
				</div>
				{detail && (
					<p className="mt-2 text-xs font-medium text-muted-foreground">
						{detail}
					</p>
				)}
				{children}
			</Card>
		</motion.div>
	);
}
