import type { DataBackupPayload } from "../domain/data-backup";
import { dataBackupPayloadSchema } from "../schemas/data-backup.schema";

export function downloadBackupFile(
	payload: DataBackupPayload,
	filename = createBackupFilename(payload.exportedAt),
): void {
	const blob = new Blob([JSON.stringify(payload, null, 2)], {
		type: "application/json",
	});

	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");

	anchor.href = url;
	anchor.download = filename;
	anchor.style.display = "none";

	document.body.append(anchor);
	anchor.click();
	anchor.remove();

	window.setTimeout(() => {
		URL.revokeObjectURL(url);
	}, 0);
}

export async function readBackupFile(file: File): Promise<DataBackupPayload> {
	const text = await file.text();

	let value: unknown;

	try {
		value = JSON.parse(text);
	} catch {
		throw new Error("BACKUP_INVALID_JSON");
	}

	return dataBackupPayloadSchema.parse(value);
}

export function createBackupFilename(exportedAt: string): string {
	const timestamp = exportedAt
		.replace(/[:.]/g, "-")
		.replace("T", "_")
		.replace("Z", "");

	return `productivity-os-backup_${timestamp}.json`;
}
