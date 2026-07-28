import { useState } from "react";
import type { SyncOperationRecord } from "@/platform/sync/sync.types";
import {
	discardRejectedOperation,
	retryFailedOperations,
} from "@/platform/sync/sync-center-client";
import { getEntityTypeLabel } from "@/platform/sync/sync-entity-registry-client";

export function OperationIssues({
	operations,
	userId,
}: {
	operations: SyncOperationRecord[];
	userId: string;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const failed = operations.filter(
		(operation) => operation.status === "failed",
	);

	const rejected = operations.filter(
		(operation) => operation.status === "rejected",
	);

	if (failed.length === 0 && rejected.length === 0) {
		return (
			<p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
				No hay operaciones fallidas o rechazadas.
			</p>
		);
	}

	return (
		<div className="space-y-4">
			{failed.length > 0 && (
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
					<div>
						<h3 className="font-medium">
							{failed.length} operación(es) fallida(s)
						</h3>
						<p className="text-sm text-muted-foreground">
							Se pueden reiniciar los intentos y ejecutar los sincronizadores.
						</p>
					</div>

					<button
						type="button"
						disabled={busy}
						className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
						onClick={async () => {
							setBusy(true);
							setError(null);

							try {
								await retryFailedOperations(userId);
							} catch (cause) {
								setError(
									cause instanceof Error
										? cause.message
										: "No fue posible reintentar.",
								);
							} finally {
								setBusy(false);
							}
						}}
					>
						{busy ? "Reintentando…" : "Reintentar fallidas"}
					</button>
				</div>
			)}

			<div className="space-y-2">
				{[...failed, ...rejected].map((operation) => (
					<article
						key={operation.id}
						className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
					>
						<div>
							<p className="text-sm font-medium">
								{getEntityTypeLabel(operation.entityType)} ·{" "}
								{operation.operation}
							</p>

							<p className="text-xs text-muted-foreground">
								{operation.status} · intento {operation.attempts}
							</p>

							{operation.lastError && (
								<p className="mt-1 text-xs text-destructive">
									{operation.lastError}
								</p>
							)}
						</div>

						{operation.status === "rejected" && (
							<button
								type="button"
								className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs text-destructive"
								onClick={() => {
									if (
										window.confirm(
											"Se eliminará esta operación local y se reiniciará el cursor para recuperar la versión remota. ¿Continuar?",
										)
									) {
										void discardRejectedOperation(operation.id, userId);
									}
								}}
							>
								Descartar y recuperar remoto
							</button>
						)}
					</article>
				))}
			</div>

			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
