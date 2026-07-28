import { useRouteContext } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import {
	clearResolvedConflicts,
	requestAllSync,
} from "@/platform/sync/sync-center-client";
import { BackupManager } from "../components/BackupManager";
import { ConflictList } from "../components/ConflictList";
import { OperationIssues } from "../components/OperationIssues";
import { SyncOverview } from "../components/SyncOverview";
import { useSyncCenter } from "../hooks/use-sync-center";

type Section = "overview" | "conflicts" | "operations" | "backups";

export function SyncCenterPage() {
	const { access } = useRouteContext({
		from: "/_app",
	});

	const identity = access.localIdentity;

	if (!identity) {
		return <p>El dispositivo no tiene una identidad local activa.</p>;
	}

	return (
		<SyncCenterContent userId={identity.userId} deviceId={identity.deviceId} />
	);
}

function SyncCenterContent({
	userId,
	deviceId,
}: {
	userId: string;
	deviceId: string;
}) {
	const snapshot = useSyncCenter(userId);
	const [section, setSection] = useState<Section>("overview");

	if (!snapshot) {
		return <p>Cargando estado local…</p>;
	}

	return (
		<section className="space-y-6">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Datos y sincronización</h1>
					<p className="text-sm text-muted-foreground">
						Revisa la cola, resuelve conflictos y protege tus datos.
					</p>
				</div>

				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						className="rounded-md border px-3 py-2 text-sm"
						onClick={() => requestAllSync()}
					>
						Sincronizar todo
					</button>

					{snapshot.resolvedConflicts > 0 && (
						<button
							type="button"
							className="rounded-md border px-3 py-2 text-sm"
							onClick={() => void clearResolvedConflicts(userId)}
						>
							Limpiar resueltos ({snapshot.resolvedConflicts})
						</button>
					)}
				</div>
			</header>

			<nav className="flex flex-wrap gap-2">
				<Tab
					active={section === "overview"}
					onClick={() => setSection("overview")}
				>
					Resumen
				</Tab>
				<Tab
					active={section === "conflicts"}
					onClick={() => setSection("conflicts")}
				>
					Conflictos ({snapshot.totals.conflicts})
				</Tab>
				<Tab
					active={section === "operations"}
					onClick={() => setSection("operations")}
				>
					Incidencias ({snapshot.totals.failed + snapshot.totals.rejected})
				</Tab>
				<Tab
					active={section === "backups"}
					onClick={() => setSection("backups")}
				>
					Backups
				</Tab>
			</nav>

			{section === "overview" && <SyncOverview snapshot={snapshot} />}

			{section === "conflicts" && (
				<ConflictList
					conflicts={snapshot.unresolvedConflicts}
					userId={userId}
					deviceId={deviceId}
				/>
			)}

			{section === "operations" && (
				<OperationIssues operations={snapshot.operations} userId={userId} />
			)}

			{section === "backups" && (
				<BackupManager userId={userId} deviceId={deviceId} />
			)}
		</section>
	);
}

function Tab({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			className={
				active
					? "rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
					: "rounded-md border px-3 py-2 text-sm"
			}
			onClick={onClick}
		>
			{children}
		</button>
	);
}
