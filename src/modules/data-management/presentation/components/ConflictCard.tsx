import { useMemo, useState } from "react";
import {
	isScheduleOverlapConflict,
	resolveSyncConflict,
} from "@/platform/sync/conflict-resolution-client";
import type {
	ConflictResolution,
	SyncConflictRecord,
} from "@/platform/sync/sync.types";
import {
	getEntityDisplayName,
	getEntityTypeLabel,
} from "@/platform/sync/sync-entity-registry-client";

export function ConflictCard({
	conflict,
	userId,
	deviceId,
}: {
	conflict: SyncConflictRecord;
	userId: string;
	deviceId: string;
}) {
	const [manualPayload, setManualPayload] = useState(() =>
		JSON.stringify(conflict.localPayload, null, 2),
	);

	const [busy, setBusy] = useState<ConflictResolution | null>(null);

	const [error, setError] = useState<string | null>(null);

	const overlap = isScheduleOverlapConflict(conflict);

	const title = useMemo(
		() => getEntityDisplayName(conflict.localPayload),
		[conflict.localPayload],
	);

	const resolve = async (
		resolution: ConflictResolution,
		mergedPayload?: unknown,
	) => {
		setBusy(resolution);
		setError(null);

		try {
			await resolveSyncConflict({
				conflictId: conflict.id,
				userId,
				deviceId,
				resolution,
				mergedPayload,
			});
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "No fue posible resolver el conflicto.",
			);
		} finally {
			setBusy(null);
		}
	};

	const handleManualMerge = async () => {
		let payload: unknown;

		try {
			payload = JSON.parse(manualPayload);
		} catch {
			setError("El JSON combinado no es válido.");
			return;
		}

		await resolve("merge_manual", payload);
	};

	return (
		<article className="space-y-4 rounded-xl border p-4">
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						{getEntityTypeLabel(conflict.entityType)}
					</p>

					<h3 className="font-semibold">{title}</h3>

					<p className="mt-1 text-sm text-muted-foreground">
						{conflict.reason}
					</p>
				</div>

				<span className="rounded-full border px-2 py-1 text-xs">
					Versión remota {conflict.remoteVersion}
				</span>
			</header>

			{overlap && (
				<div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
					La carga remota representa el elemento que ocupa el horario. Ajusta
					`startAt` y `endAt` en el JSON local antes de reintentar, o descarta
					el cambio local.
				</div>
			)}

			<div className="grid gap-3 xl:grid-cols-2">
				<PayloadPanel title="Versión local" payload={conflict.localPayload} />

				<PayloadPanel
					title={overlap ? "Elemento que bloquea el horario" : "Versión remota"}
					payload={conflict.remotePayload}
				/>
			</div>

			<details className="rounded-lg border p-3">
				<summary className="cursor-pointer font-medium">
					Combinar manualmente
				</summary>

				<div className="mt-3 space-y-3">
					<p className="text-sm text-muted-foreground">
						Edita un snapshot completo. El ID y el usuario se conservarán de
						forma segura aunque intentes modificarlos.
					</p>

					<textarea
						value={manualPayload}
						onChange={(event) => setManualPayload(event.target.value)}
						rows={18}
						spellCheck={false}
						className="w-full rounded-md border bg-muted/20 p-3 font-mono text-xs"
					/>

					<button
						type="button"
						disabled={busy !== null}
						className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
						onClick={() => void handleManualMerge()}
					>
						{busy === "merge_manual" ? "Reintentando…" : "Validar y reintentar"}
					</button>
				</div>
			</details>

			{error && (
				<p
					role="alert"
					className="rounded-md border border-destructive/40 p-3 text-sm text-destructive"
				>
					{error}
				</p>
			)}

			<div className="flex flex-wrap gap-2">
				{!overlap && (
					<>
						<ResolutionButton
							label="Conservar remoto"
							busy={busy === "accept_remote"}
							disabled={busy !== null}
							onClick={() => void resolve("accept_remote")}
						/>

						<ResolutionButton
							label="Conservar local"
							busy={busy === "keep_local"}
							disabled={busy !== null}
							onClick={() => void resolve("keep_local")}
						/>

						<ResolutionButton
							label="Duplicar local"
							busy={busy === "duplicate_local"}
							disabled={busy !== null}
							onClick={() => void resolve("duplicate_local")}
						/>
					</>
				)}

				<ResolutionButton
					label="Descartar cambio local"
					busy={busy === "discard_local"}
					disabled={busy !== null}
					danger
					onClick={() => {
						if (
							window.confirm(
								"¿Descartar el cambio local relacionado con este conflicto?",
							)
						) {
							void resolve("discard_local");
						}
					}}
				/>
			</div>

			<p className="text-xs text-muted-foreground">
				Creado {formatDate(conflict.createdAt)} · ID {conflict.entityId}
			</p>
		</article>
	);
}

function PayloadPanel({ title, payload }: { title: string; payload: unknown }) {
	return (
		<section className="min-w-0 rounded-lg border p-3">
			<h4 className="mb-2 text-sm font-medium">{title}</h4>

			<pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/30 p-3 text-xs">
				{JSON.stringify(payload, null, 2)}
			</pre>
		</section>
	);
}

function ResolutionButton({
	label,
	busy,
	disabled,
	danger = false,
	onClick,
}: {
	label: string;
	busy: boolean;
	disabled: boolean;
	danger?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			disabled={disabled}
			className={
				danger
					? "rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive disabled:opacity-50"
					: "rounded-md border px-3 py-2 text-sm disabled:opacity-50"
			}
			onClick={onClick}
		>
			{busy ? "Procesando…" : label}
		</button>
	);
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat("es-PE", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}
