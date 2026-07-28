import type { SyncCenterSnapshot } from "../hooks/use-sync-center";

export function SyncOverview({ snapshot }: { snapshot: SyncCenterSnapshot }) {
	return (
		<div className="space-y-4">
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
				<Metric label="Pendientes" value={snapshot.totals.pending} />
				<Metric label="Procesando" value={snapshot.totals.processing} />
				<Metric label="Fallidas" value={snapshot.totals.failed} />
				<Metric label="Rechazadas" value={snapshot.totals.rejected} />
				<Metric label="Conflictos" value={snapshot.totals.conflicts} />
			</div>

			<div className="overflow-x-auto rounded-xl border">
				<table className="w-full min-w-[760px] text-sm">
					<thead className="border-b bg-muted/40 text-left">
						<tr>
							<th className="px-4 py-3">Módulo</th>
							<th className="px-4 py-3">Estado</th>
							<th className="px-4 py-3">Pendientes</th>
							<th className="px-4 py-3">Fallidas</th>
							<th className="px-4 py-3">Rechazadas</th>
							<th className="px-4 py-3">Conflictos</th>
							<th className="px-4 py-3">Última sincronización</th>
						</tr>
					</thead>

					<tbody>
						{snapshot.modules.map((module) => (
							<tr key={module.key} className="border-b last:border-0">
								<td className="px-4 py-3 font-medium">{module.label}</td>
								<td className="px-4 py-3">{runtimeLabel(module.state)}</td>
								<td className="px-4 py-3">{module.pending}</td>
								<td className="px-4 py-3">{module.failed}</td>
								<td className="px-4 py-3">{module.rejected}</td>
								<td className="px-4 py-3">{module.conflicts}</td>
								<td className="px-4 py-3 text-muted-foreground">
									{module.lastCompletedAt
										? formatDate(module.lastCompletedAt)
										: "Todavía no"}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function Metric({ label, value }: { label: string; value: number }) {
	return (
		<article className="rounded-xl border p-4">
			<p className="text-sm text-muted-foreground">{label}</p>
			<p className="mt-1 text-2xl font-semibold">{value}</p>
		</article>
	);
}

function runtimeLabel(
	state: SyncCenterSnapshot["modules"][number]["state"],
): string {
	return {
		idle: "Listo",
		syncing: "Sincronizando",
		offline: "Offline",
		reauthentication_required: "Requiere sesión",
		error: "Error",
	}[state];
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat("es-PE", {
		dateStyle: "short",
		timeStyle: "short",
	}).format(new Date(value));
}
