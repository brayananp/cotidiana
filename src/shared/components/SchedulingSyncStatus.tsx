import { requestSchedulingSync } from "@/platform/sync/scheduling-sync-events-client";
import { useSchedulingSyncStatus } from "@/platform/sync/use-scheduling-sync-status";

export function SchedulingSyncStatus({
	userId,
}: {
	userId: string | undefined;
}) {
	const status = useSchedulingSyncStatus(userId);

	if (!status || !userId) {
		return null;
	}

	const label =
		status.state === "syncing"
			? "Sincronizando agenda…"
			: status.state === "offline"
				? "Agenda offline"
				: status.state === "reauthentication_required"
					? "Agenda requiere sesión"
					: status.state === "error"
						? "Error al sincronizar agenda"
						: status.conflicts > 0
							? `${status.conflicts} conflicto(s) de agenda`
							: status.pending > 0
								? `${status.pending} cambio(s) de agenda pendiente(s)`
								: "Agenda sincronizada";

	return (
		<button
			type="button"
			className="rounded-md border px-3 py-1.5 text-xs"
			title={status.lastError ?? undefined}
			onClick={() => requestSchedulingSync()}
		>
			{label}
		</button>
	);
}
