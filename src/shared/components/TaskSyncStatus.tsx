import { requestTaskSync } from "@/platform/sync/sync-events.client";
import { useTaskSyncStatus } from "@/platform/sync/use-task-sync-status";

type TaskSyncStatusProps = {
	userId: string | undefined;
};

export function TaskSyncStatus({ userId }: TaskSyncStatusProps) {
	const status = useTaskSyncStatus(userId);

	if (!userId || !status) {
		return null;
	}

	const label = getLabel(status);

	return (
		<button
			type="button"
			className="rounded-md border px-3 py-1.5 text-sm"
			onClick={requestTaskSync}
			title={status.lastError ?? "Ejecutar sincronización ahora"}
		>
			{label}
		</button>
	);
}

function getLabel(status: {
	state: string;
	pending: number;
	rejected: number;
	conflicts: number;
}): string {
	if (status.state === "syncing") {
		return "Sincronizando…";
	}

	if (status.state === "offline") {
		return `Offline · ${status.pending} pendiente(s)`;
	}

	if (status.state === "reauthentication_required") {
		return "Reautenticación requerida";
	}

	if (status.conflicts > 0) {
		return `${status.conflicts} conflicto(s)`;
	}

	if (status.rejected > 0) {
		return `${status.rejected} rechazado(s)`;
	}

	if (status.pending > 0) {
		return `${status.pending} pendiente(s)`;
	}

	if (status.state === "error") {
		return "Error de sincronización";
	}

	return "Sincronizado";
}
