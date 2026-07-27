export function localDateTimeToIso(value: string): string | null {
	const normalized = value.trim();

	if (!normalized) {
		return null;
	}

	const date = new Date(normalized);

	if (Number.isNaN(date.getTime())) {
		throw new Error("INVALID_DATE_TIME");
	}

	return date.toISOString();
}

export function isoToLocalDateTime(value: string | null): string {
	if (!value) {
		return "";
	}

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return "";
	}

	const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

	return local.toISOString().slice(0, 16);
}
