export function startOfLocalWeek(date: Date): Date {
	const result = new Date(date);
	result.setHours(0, 0, 0, 0);

	const day = result.getDay();
	const offset = day === 0 ? -6 : 1 - day;
	result.setDate(result.getDate() + offset);

	return result;
}

export function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

export function toRangeIso(date: Date): string {
	return date.toISOString();
}

export function dateKey(iso: string): string {
	const date = new Date(iso);

	return [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, "0"),
		String(date.getDate()).padStart(2, "0"),
	].join("-");
}

export function defaultLocalDateTime(date = new Date(), hour = 9): string {
	const value = new Date(date);
	value.setHours(hour, 0, 0, 0);

	const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);

	return local.toISOString().slice(0, 16);
}
