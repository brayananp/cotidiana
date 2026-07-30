import type { DomainSyncStatus, GlobalSyncStatus } from "./global-sync-status";
import type { SyncDomain } from "./sync-coordinator-client";

const DOMAIN_LABELS: Record<SyncDomain, string> = {
	tasks: "Tareas",
	scheduling: "Agenda",
	reminders: "Recordatorios",
	library: "Biblioteca",
	settings: "Preferencias",
	"daily-review": "Revisión diaria",
};

export function getGlobalSyncLabel(status: GlobalSyncStatus): string {
	switch (status.state) {
		case "syncing":
			return "Sincronizando…";
		case "offline":
			return "Sin conexión";
		case "reauthentication_required":
			return "Inicia sesión";
		case "attention":
			return `${status.conflicts + status.rejected} requieren atención`;
		case "error":
			return `Error en ${status.errorDomains} secciones`;
		case "pending":
			return `${status.pending} cambios pendientes`;
		case "synced":
			return "Sincronizado";
	}
}

export function getManualSyncTarget(
	status: GlobalSyncStatus,
): readonly SyncDomain[] | "all" {
	const domains = status.domains
		.filter((domain) => domain.state === "error" || domain.pending > 0)
		.map((domain) => domain.domain);

	return domains.length > 0 ? domains : "all";
}

export function getDomainLabel(domain: SyncDomain): string {
	return DOMAIN_LABELS[domain];
}

export function getDomainStatusLabel(status: DomainSyncStatus): string {
	if (status.state === "syncing") {
		return "Sincronizando";
	}

	if (status.state === "offline") {
		return "Sin conexión";
	}

	if (status.state === "reauthentication_required") {
		return "Requiere sesión";
	}

	if (status.conflicts > 0) {
		return `${status.conflicts} conflictos`;
	}

	if (status.rejected > 0) {
		return `${status.rejected} rechazados`;
	}

	if (status.state === "error") {
		return "Error";
	}

	if (status.pending > 0) {
		return `${status.pending} pendientes`;
	}

	return "Al día";
}
