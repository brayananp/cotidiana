import { useEffect, useState } from "react";
import { activateWaitingWorker } from "./pwa-state-client";
import { usePwaStatus } from "./use-pwa-status";

export function PwaUpdatePrompt() {
	const status = usePwaStatus();
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		if (!status.updateAvailable) {
			setDismissed(false);
		}
	}, [status.updateAvailable]);

	if (!status.updateAvailable || dismissed) {
		return null;
	}

	return (
		<aside
			role="alert"
			className="fixed bottom-4 right-4 z-50 w-[min(92vw,380px)] rounded-xl border bg-background p-4 shadow-xl"
		>
			<h2 className="font-semibold">Nueva versión disponible</h2>

			<p className="mt-1 text-sm text-muted-foreground">
				Actualiza para usar los cambios más recientes. Los datos locales en
				Dexie no se eliminarán.
			</p>

			<div className="mt-4 flex justify-end gap-2">
				<button
					type="button"
					className="rounded-md border px-3 py-2 text-sm"
					onClick={() => setDismissed(true)}
				>
					Más tarde
				</button>

				<button
					type="button"
					disabled={status.updateApplying}
					className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
					onClick={() => activateWaitingWorker()}
				>
					{status.updateApplying ? "Actualizando…" : "Actualizar ahora"}
				</button>
			</div>
		</aside>
	);
}
