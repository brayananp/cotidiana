const BASE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 5 * 60_000;

export function getRetryDelayMs(
	attempts: number,
	random = Math.random,
): number {
	const exponent = Math.max(0, attempts - 1);

	const rawDelay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** exponent);

	const jitterFactor = 0.75 + random() * 0.5;

	return Math.round(rawDelay * jitterFactor);
}

export function getNextRetryAt(
	attempts: number,
	now = new Date(),
	random = Math.random,
): string {
	return new Date(
		now.getTime() + getRetryDelayMs(attempts, random),
	).toISOString();
}
