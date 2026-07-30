import { Link } from "@tanstack/react-router";
import {
	getDomainLabel,
	getDomainStatusLabel,
	getGlobalSyncLabel,
	getManualSyncTarget,
} from "@/platform/sync/global-sync-indicator-model";
import type { DomainSyncStatus } from "@/platform/sync/global-sync-status";
import { requestSync } from "@/platform/sync/sync-request-events-client";
import { useGlobalSyncStatus } from "@/platform/sync/use-global-sync-status";
import { Button } from "@/shared/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils";

export function GlobalSyncIndicator({
	userId,
}: {
	userId: string | undefined;
}) {
	const status = useGlobalSyncStatus(userId);

	if (!userId) {
		return null;
	}

	if (!status) {
		return (
			<span
				className="h-7 w-7 animate-pulse rounded-full bg-muted"
				aria-hidden
			/>
		);
	}

	const label = getGlobalSyncLabel(status);
	const actionsDisabled =
		status.state === "offline" ||
		status.state === "reauthentication_required" ||
		status.state === "syncing";

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						size="sm"
						className="max-w-40 gap-2 overflow-hidden px-2.5"
						aria-label={`Estado de sincronización: ${label}`}
					>
						<StatusDot state={status.state} />
						<span className="hidden truncate sm:inline" aria-live="polite">
							{label}
						</span>
					</Button>
				}
			/>

			<PopoverContent
				align="end"
				sideOffset={8}
				className="w-[min(22rem,calc(100vw-2rem))] gap-3 rounded-2xl p-3"
			>
				<PopoverHeader className="px-1 pt-1">
					<PopoverTitle className="flex items-center gap-2">
						<StatusDot state={status.state} />
						{label}
					</PopoverTitle>
					<PopoverDescription>
						Un solo ciclo mantiene al día todas tus secciones.
					</PopoverDescription>
				</PopoverHeader>

				<ul className="grid gap-1" aria-label="Estado por sección">
					{status.domains.map((domain) => (
						<DomainStatusRow
							key={domain.domain}
							status={domain}
							actionsDisabled={actionsDisabled}
						/>
					))}
				</ul>

				<div className="flex items-center justify-between gap-3 border-t px-1 pt-3">
					<Button
						type="button"
						variant="secondary"
						size="sm"
						disabled={actionsDisabled}
						onClick={() => requestSync(getManualSyncTarget(status))}
					>
						Sincronizar ahora
					</Button>

					<Link
						to="/settings/sync"
						className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
					>
						Ver detalles
					</Link>
				</div>
			</PopoverContent>
		</Popover>
	);
}

function DomainStatusRow({
	status,
	actionsDisabled,
}: {
	status: DomainSyncStatus;
	actionsDisabled: boolean;
}) {
	const canRetry =
		!actionsDisabled && (status.state === "error" || status.pending > 0);

	return (
		<li
			className="flex min-h-11 items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-muted/60"
			title={status.lastError ?? undefined}
		>
			<StatusDot state={getDomainTone(status)} />

			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">
					{getDomainLabel(status.domain)}
				</p>
				<p className="truncate text-xs text-muted-foreground">
					{getDomainStatusLabel(status)}
					{status.lastCompletedAt
						? ` · ${formatSyncTime(status.lastCompletedAt)}`
						: ""}
				</p>
			</div>

			{canRetry ? (
				<Button
					type="button"
					variant="ghost"
					size="xs"
					onClick={() => requestSync(status.domain)}
					aria-label={`Reintentar sincronización de ${getDomainLabel(status.domain)}`}
				>
					Reintentar
				</Button>
			) : null}
		</li>
	);
}

function StatusDot({
	state,
}: {
	state:
		| "synced"
		| "pending"
		| "syncing"
		| "offline"
		| "reauthentication_required"
		| "attention"
		| "error"
		| "idle";
}) {
	return (
		<span
			aria-hidden
			className={cn(
				"size-2 shrink-0 rounded-full ring-4 ring-current/10",
				state === "synced" || state === "idle"
					? "bg-emerald-500 text-emerald-500"
					: state === "syncing"
						? "animate-pulse bg-sky-500 text-sky-500"
						: state === "pending" || state === "attention"
							? "bg-amber-500 text-amber-500"
							: state === "error"
								? "bg-destructive text-destructive"
								: "bg-muted-foreground text-muted-foreground",
			)}
		/>
	);
}

function getDomainTone(
	status: DomainSyncStatus,
):
	| "idle"
	| "pending"
	| "syncing"
	| "offline"
	| "reauthentication_required"
	| "attention"
	| "error" {
	if (status.conflicts > 0 || status.rejected > 0) {
		return "attention";
	}

	if (status.pending > 0 && status.state === "idle") {
		return "pending";
	}

	return status.state;
}

function formatSyncTime(value: string): string {
	return new Intl.DateTimeFormat("es-PE", {
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(value));
}
