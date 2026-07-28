import { requestLibrarySync } from "#/platform/sync/library-sync-events-client";
import { useLibrarySyncStatus } from "#/platform/sync/use-library-sync-status";

export function LibrarySyncStatus({ userId }: { userId: string | undefined }) {
	const status = useLibrarySyncStatus(userId);

	if (!status || !userId) {
		return null;
	}

	const label =
		status.state === "syncing"
			? "Sincronizando biblioteca…"
			: status.state === "offline"
				? "Biblioteca offline"
				: status.state === "reauthentication_required"
					? "Biblioteca requiere sesión"
					: status.state === "error"
						? "Error en biblioteca"
						: status.conflicts > 0
							? `${status.conflicts} conflicto(s) de biblioteca`
							: status.pending > 0
								? `${status.pending} cambio(s) de biblioteca pendiente(s)`
								: "Biblioteca sincronizada";

	return (
		<button
			type="button"
			className="rounded-md border px-3 py-1.5 text-xs"
			title={status.lastError ?? undefined}
			onClick={() => requestLibrarySync()}
		>
			{label}
		</button>
	);
}
