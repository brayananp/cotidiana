"use client";

export function getErrorMessage(error: unknown): string {
	if (typeof error === "string") {
		return error;
	}

	if (
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof error.message === "string"
	) {
		return error.message;
	}

	return "Valor inválido";
}

export function getSchedulingError(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message === "SCHEDULE_OVERLAP") {
		return "El horario se solapa con otro bloque o evento existente.";
	}

	return error instanceof Error ? error.message : fallback;
}
