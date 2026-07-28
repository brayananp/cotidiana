import type { SyncConflictRecord } from "@/platform/sync/sync.types";
import { ConflictCard } from "./ConflictCard";

export function ConflictList({
	conflicts,
	userId,
	deviceId,
}: {
	conflicts: SyncConflictRecord[];
	userId: string;
	deviceId: string;
}) {
	if (conflicts.length === 0) {
		return (
			<div className="rounded-xl border border-dashed p-6 text-center">
				<h3 className="font-medium">No hay conflictos pendientes</h3>
				<p className="text-sm text-muted-foreground">
					Los cambios locales y remotos no requieren intervención.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{conflicts.map((conflict) => (
				<ConflictCard
					key={conflict.id}
					conflict={conflict}
					userId={userId}
					deviceId={deviceId}
				/>
			))}
		</div>
	);
}
