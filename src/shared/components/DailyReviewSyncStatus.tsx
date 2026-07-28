import { requestDailyReviewSync } from "#/platform/sync/daily-review-sync-events-client";
import { useDailyReviewSyncStatus } from "@/platform/sync/use-daily-review-sync-status";

export function DailyReviewSyncStatus({
	userId,
}: {
	userId: string | undefined;
}) {
	const status = useDailyReviewSyncStatus(userId);
	if (!status || !userId) return null;

	const label =
		status.state === "syncing"
			? "Sincronizando revisión…"
			: status.state === "offline"
				? "Revisión offline"
				: status.state === "reauthentication_required"
					? "Revisión requiere sesión"
					: status.state === "error"
						? "Error en revisión"
						: status.conflicts > 0
							? `${status.conflicts} conflicto(s) de revisión`
							: status.pending > 0
								? `${status.pending} revisión pendiente`
								: "Revisión sincronizada";

	return (
		<button
			type="button"
			className="rounded-md border px-3 py-1.5 text-xs"
			title={status.lastError ?? undefined}
			onClick={() => requestDailyReviewSync()}
		>
			{label}
		</button>
	);
}
