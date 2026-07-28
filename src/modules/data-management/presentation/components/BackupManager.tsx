import { useState } from "react";
import { requestAllSync } from "@/platform/sync/sync-center-client";
import {
	createDataBackupPayload,
	createLocalBackup,
	deleteLocalBackup,
	importDataBackup,
} from "../../application/backup.service-client";
import {
	downloadBackupFile,
	readBackupFile,
} from "../../application/backup-file-client";
import {
	countBackupData,
	type DataBackupPayload,
	type ImportMode,
} from "../../domain/data-backup";
import { useLocalBackups } from "../hooks/use-local-backups";

export function BackupManager({
	userId,
	deviceId,
}: {
	userId: string;
	deviceId: string;
}) {
	const backups = useLocalBackups(userId);
	const [importPayload, setImportPayload] = useState<DataBackupPayload | null>(
		null,
	);
	const [importFilename, setImportFilename] = useState<string | null>(null);
	const [mode, setMode] = useState<ImportMode>("merge");
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const run = async (operation: () => Promise<void>) => {
		setBusy(true);
		setError(null);
		setMessage(null);

		try {
			await operation();
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "La operación no pudo completarse.",
			);
		} finally {
			setBusy(false);
		}
	};

	const handleImport = async () => {
		if (!importPayload) {
			return;
		}

		if (
			mode === "replace_local" &&
			!window.confirm(
				"Se reemplazarán los datos locales del usuario. Antes se creará un backup automático. ¿Continuar?",
			)
		) {
			return;
		}

		await run(async () => {
			const result = await importDataBackup({
				payload: importPayload,
				userId,
				deviceId,
				mode,
			});

			requestAllSync();

			setMessage(
				[
					`${result.imported} registro(s) importado(s).`,
					`${result.skipped} omitido(s).`,
					`${result.operationsCreated} operación(es) creada(s).`,
				].join(" "),
			);

			setImportPayload(null);
			setImportFilename(null);
		});
	};

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					disabled={busy}
					className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
					onClick={() =>
						void run(async () => {
							const backup = await createLocalBackup(userId, "manual");

							setMessage(`Backup local creado: ${backup.label}`);
						})
					}
				>
					Crear backup local
				</button>

				<button
					type="button"
					disabled={busy}
					className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
					onClick={() =>
						void run(async () => {
							const payload = await createDataBackupPayload(userId);

							downloadBackupFile(payload);
							setMessage("Backup JSON descargado.");
						})
					}
				>
					Exportar JSON
				</button>
			</div>

			<section className="space-y-3 rounded-xl border p-4">
				<div>
					<h3 className="font-medium">Importar archivo</h3>
					<p className="text-sm text-muted-foreground">
						El archivo se valida antes de modificar IndexedDB.
					</p>
				</div>

				<input
					type="file"
					accept="application/json,.json"
					disabled={busy}
					onChange={(event) => {
						const file = event.target.files?.[0];

						if (!file) {
							return;
						}

						void run(async () => {
							const payload = await readBackupFile(file);

							setImportPayload(payload);
							setImportFilename(file.name);
							setMessage("Archivo validado correctamente.");
						});
					}}
					className="block w-full text-sm"
				/>

				{importPayload && (
					<div className="space-y-3 rounded-lg bg-muted/30 p-3">
						<p className="text-sm font-medium">{importFilename}</p>

						<BackupCounts payload={importPayload} />

						<label className="block space-y-1">
							<span className="text-sm font-medium">Modo de importación</span>

							<select
								value={mode}
								onChange={(event) => setMode(event.target.value as ImportMode)}
								className="h-10 w-full rounded-md border px-3"
							>
								<option value="merge">Combinar datos más recientes</option>
								<option value="replace_local">Reemplazar datos locales</option>
							</select>
						</label>

						<button
							type="button"
							disabled={busy}
							className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
							onClick={() => void handleImport()}
						>
							{busy ? "Importando…" : "Importar backup"}
						</button>
					</div>
				)}
			</section>

			<section className="space-y-3">
				<div>
					<h3 className="font-medium">Backups locales</h3>
					<p className="text-sm text-muted-foreground">
						Se conservan los 20 más recientes por usuario.
					</p>
				</div>

				{backups.length === 0 ? (
					<p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
						No existen backups locales.
					</p>
				) : (
					<div className="space-y-2">
						{backups.map((backup) => (
							<article
								key={backup.id}
								className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
							>
								<div>
									<p className="font-medium">{backup.label}</p>
									<p className="text-xs text-muted-foreground">
										{formatDate(backup.createdAt)} ·{" "}
										{formatBytes(backup.sizeBytes)} · {backup.reason}
									</p>
									<BackupCounts payload={backup.payload} />
								</div>

								<div className="flex flex-wrap gap-2">
									<button
										type="button"
										className="rounded-md border px-2 py-1.5 text-xs"
										onClick={() => downloadBackupFile(backup.payload)}
									>
										Descargar
									</button>

									<button
										type="button"
										disabled={busy}
										className="rounded-md border px-2 py-1.5 text-xs disabled:opacity-50"
										onClick={() =>
											void run(async () => {
												const result = await importDataBackup({
													payload: backup.payload,
													userId,
													deviceId,
													mode: "merge",
												});

												requestAllSync();
												setMessage(
													`${result.imported} registro(s) restaurado(s) por combinación.`,
												);
											})
										}
									>
										Restaurar merge
									</button>

									<button
										type="button"
										disabled={busy}
										className="rounded-md border px-2 py-1.5 text-xs disabled:opacity-50"
										onClick={() => {
											if (
												window.confirm(
													"¿Reemplazar los datos locales con este backup? Se creará otra copia de seguridad antes de restaurar.",
												)
											) {
												void run(async () => {
													const result = await importDataBackup({
														payload: backup.payload,
														userId,
														deviceId,
														mode: "replace_local",
													});

													requestAllSync();
													setMessage(
														`${result.imported} registro(s) restaurado(s).`,
													);
												});
											}
										}}
									>
										Reemplazar local
									</button>

									<button
										type="button"
										disabled={busy}
										className="rounded-md border border-destructive/40 px-2 py-1.5 text-xs text-destructive disabled:opacity-50"
										onClick={() => {
											if (window.confirm("¿Eliminar este backup local?")) {
												void run(async () => {
													await deleteLocalBackup(backup.id, userId);
												});
											}
										}}
									>
										Eliminar
									</button>
								</div>
							</article>
						))}
					</div>
				)}
			</section>

			{message && (
				<output className="rounded-md border p-3 text-sm">{message}</output>
			)}

			{error && (
				<p
					role="alert"
					className="rounded-md border border-destructive/40 p-3 text-sm text-destructive"
				>
					{error}
				</p>
			)}
		</div>
	);
}

function BackupCounts({ payload }: { payload: DataBackupPayload }) {
	const counts = countBackupData(payload);

	return (
		<p className="mt-1 text-xs text-muted-foreground">
			{counts.tasks} tareas · {counts.timeBlocks} bloques ·{" "}
			{counts.calendarEvents} eventos · {counts.reminders} recordatorios ·{" "}
			{counts.books} libros · {counts.bookNotes} notas
		</p>
	);
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat("es-PE", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

function formatBytes(value: number): string {
	if (value < 1024) {
		return `${value} B`;
	}

	if (value < 1024 * 1024) {
		return `${(value / 1024).toFixed(1)} KB`;
	}

	return `${(value / 1024 / 1024).toFixed(2)} MB`;
}
