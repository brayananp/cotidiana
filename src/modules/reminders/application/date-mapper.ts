export function localDateTimeToIso(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		throw new Error("INVALID_DATE_TIME");
	}

	return date.toISOString();
}

export function isoToLocalDateTime(value: string): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return "";
	}

	const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

	return local.toISOString().slice(0, 16);
}
