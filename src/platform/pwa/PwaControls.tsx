import { activateWaitingWorker, requestPwaInstall } from "./pwa-state-client";
import { usePwaStatus } from "./use-pwa-status";

export function PwaControls() {
	const status = usePwaStatus();

	if (!status.supported) {
		return null;
	}

	return (
		<div className="flex items-center gap-2">
			{status.installAvailable && !status.installed && (
				<button
					type="button"
					className="rounded-md border px-3 py-1.5 text-xs"
					onClick={() => void requestPwaInstall()}
				>
					Instalar aplicación
				</button>
			)}

			{status.updateAvailable && (
				<button
					type="button"
					disabled={status.updateApplying}
					className="rounded-md border px-3 py-1.5 text-xs"
					onClick={() => activateWaitingWorker()}
				>
					{status.updateApplying ? "Actualizando…" : "Actualizar aplicación"}
				</button>
			)}

			{status.offlineReady &&
				!status.updateAvailable &&
				!status.installAvailable && (
					<span
						className="text-xs text-muted-foreground"
						title={
							status.error ??
							"La aplicación puede usar recursos almacenados sin conexión."
						}
					>
						Disponible offline
					</span>
				)}
		</div>
	);
}
