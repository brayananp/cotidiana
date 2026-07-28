import { requestSettingsSync } from "#/platform/sync/settings-sync-events-client";
import { useSettingsSyncStatus } from "@/platform/sync/use-settings-sync-status";

export function SettingsSyncStatus({ userId }: { userId: string | undefined }) {
	const status = useSettingsSyncStatus(userId);

	if (!status || !userId) {
		return null;
	}

	const label =
		status.state === "syncing"
			? "Sincronizando preferencias…"
			: status.state === "offline"
				? "Preferencias offline"
				: status.state === "reauthentication_required"
					? "Preferencias requieren sesión"
					: status.state === "error"
						? "Error en preferencias"
						: status.conflicts > 0
							? `${status.conflicts} conflicto(s) de preferencias`
							: status.pending > 0
								? `${status.pending} preferencia(s) pendiente(s)`
								: "Preferencias sincronizadas";

	return (
		<button
			type="button"
			className="rounded-md border px-3 py-1.5 text-xs"
			title={status.lastError ?? undefined}
			onClick={() => requestSettingsSync()}
		>
			{label}
		</button>
	);
}
