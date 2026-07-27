import { requestReminderSync } from "#/platform/sync/reminder-sync-events-client";
import { useReminderSyncStatus } from "@/platform/sync/use-reminder-sync-status";

export function ReminderSyncStatus({ userId }: { userId: string | undefined }) {
	const status = useReminderSyncStatus(userId);

	if (!status || !userId) {
		return null;
	}

	const label =
		status.state === "syncing"
			? "Sincronizando recordatorios…"
			: status.state === "offline"
				? "Recordatorios offline"
				: status.state === "reauthentication_required"
					? "Recordatorios requieren sesión"
					: status.state === "error"
						? "Error en recordatorios"
						: status.conflicts > 0
							? `${status.conflicts} conflicto(s) de recordatorios`
							: status.pending > 0
								? `${status.pending} recordatorio(s) pendiente(s)`
								: "Recordatorios sincronizados";

	return (
		<button
			type="button"
			className="rounded-md border px-3 py-1.5 text-xs"
			title={status.lastError ?? undefined}
			onClick={() => requestReminderSync()}
		>
			{label}
		</button>
	);
}
