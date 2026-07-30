import { Download01Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import { Button } from "@/shared/components/ui/button";
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
				<motion.div
					initial={{ scale: 0.9, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
				>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-8 gap-1.5 border-primary/20 bg-primary/5 text-xs text-primary hover:bg-primary/10 hover:text-primary"
						onClick={() => void requestPwaInstall()}
					>
						<HugeiconsIcon icon={Download01Icon} size={14} />
						<span>Instalar app</span>
					</Button>
				</motion.div>
			)}

			{status.updateAvailable && (
				<motion.div
					initial={{ scale: 0.9, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
				>
					<Button
						type="button"
						variant="default"
						size="sm"
						className="h-8 gap-1.5 text-xs"
						disabled={status.updateApplying}
						onClick={() => activateWaitingWorker()}
					>
						<HugeiconsIcon
							icon={RefreshIcon}
							size={14}
							className={status.updateApplying ? "animate-spin" : ""}
						/>
						<span>
							{status.updateApplying ? "Actualizando…" : "Actualizar app"}
						</span>
					</Button>
				</motion.div>
			)}

			{status.offlineReady &&
				!status.updateAvailable &&
				!status.installAvailable && (
					<span
						className="hidden text-xs text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
						title={
							status.error ??
							"La aplicación puede usar recursos almacenados sin conexión."
						}
					>
						Offline listo
					</span>
				)}
		</div>
	);
}
