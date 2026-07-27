"use client";

import { Label } from "#/shared/components/ui/label";
import type { ReactNode } from "react";

type FormFieldProps = {
	label: string;
	errors: readonly unknown[];
	children: ReactNode;
};

export function FormField({ label, errors, children }: FormFieldProps) {
	return (
		<Label className="space-y-1.5">
			<span className="text-sm font-medium">{label}</span>
			{children}
			{errors.length > 0 && (
				<span className="block text-sm text-destructive">
					{errors.map(getErrorMessage).join(", ")}
				</span>
			)}
		</Label>
	);
}

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
		return "El horario se solapa con otro bloque o evento.";
	}

	return error instanceof Error ? error.message : fallback;
}
