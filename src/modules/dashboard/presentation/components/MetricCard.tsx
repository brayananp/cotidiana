import type { ReactNode } from "react";

export function MetricCard({
	label,
	value,
	detail,
	children,
}: {
	label: string;
	value: string | number;
	detail?: string;
	children?: ReactNode;
}) {
	return (
		<article className="rounded-xl border p-4">
			<p className="text-sm text-muted-foreground">{label}</p>
			<p className="mt-1 text-2xl font-semibold">{value}</p>
			{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
			{children}
		</article>
	);
}
