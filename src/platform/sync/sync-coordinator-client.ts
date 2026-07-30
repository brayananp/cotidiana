export const SYNC_DOMAINS = [
	"tasks",
	"scheduling",
	"reminders",
	"library",
	"settings",
	"daily-review",
] as const;

export type SyncDomain = (typeof SYNC_DOMAINS)[number];

export type SyncEngine = {
	run: () => Promise<unknown>;
};

export type SyncRunOutcome<TDomain extends string> =
	| {
			domain: TDomain;
			pass: number;
			status: "fulfilled";
	  }
	| {
			domain: TDomain;
			pass: number;
			status: "rejected";
			error: unknown;
	  };

export type SyncDrainReport<TDomain extends string> = {
	runs: SyncRunOutcome<TDomain>[];
};

export type SyncCoordinator<TDomain extends string> = {
	request: (
		target: TDomain | readonly TDomain[] | "all",
	) => Promise<SyncDrainReport<TDomain>>;
};

type SyncCoordinatorOptions<TDomain extends string> = {
	engines: Readonly<Record<TDomain, SyncEngine>>;
	maxConcurrency?: number;
};

const DEFAULT_MAX_CONCURRENCY = 2;

export function createSyncCoordinator<const TDomain extends string>(
	options: SyncCoordinatorOptions<TDomain>,
): SyncCoordinator<TDomain> {
	const domains = Object.keys(options.engines) as TDomain[];
	const maxConcurrency = options.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY;

	if (domains.length === 0) {
		throw new Error("SYNC_COORDINATOR_REQUIRES_ENGINES");
	}

	if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1) {
		throw new Error("SYNC_COORDINATOR_INVALID_CONCURRENCY");
	}

	const pending = new Set<TDomain>();
	let currentDrain: Promise<SyncDrainReport<TDomain>> | null = null;

	const enqueue = (target: TDomain | readonly TDomain[] | "all"): void => {
		const requestedDomains =
			target === "all"
				? domains
				: Array.isArray(target)
					? target
					: [target as TDomain];

		for (const domain of requestedDomains) {
			pending.add(domain);
		}
	};

	const runBatch = async (
		batch: TDomain[],
		pass: number,
	): Promise<SyncRunOutcome<TDomain>[]> => {
		const outcomes = new Array<SyncRunOutcome<TDomain>>(batch.length);
		let nextIndex = 0;

		const runWorker = async (): Promise<void> => {
			while (nextIndex < batch.length) {
				const index = nextIndex;
				nextIndex += 1;

				const domain = batch[index];
				const engine = options.engines[domain];

				try {
					await engine.run();
					outcomes[index] = {
						domain,
						pass,
						status: "fulfilled",
					};
				} catch (error) {
					outcomes[index] = {
						domain,
						pass,
						status: "rejected",
						error,
					};
				}
			}
		};

		const workerCount = Math.min(maxConcurrency, batch.length);

		await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

		return outcomes;
	};

	const drain = async (): Promise<SyncDrainReport<TDomain>> => {
		const runs: SyncRunOutcome<TDomain>[] = [];
		let pass = 0;

		while (true) {
			await Promise.resolve();

			if (pending.size === 0) {
				currentDrain = null;
				return { runs };
			}

			pass += 1;

			const batch = [...pending];
			pending.clear();

			runs.push(...(await runBatch(batch, pass)));
		}
	};

	const request = (
		target: TDomain | readonly TDomain[] | "all",
	): Promise<SyncDrainReport<TDomain>> => {
		enqueue(target);

		if (currentDrain) {
			return currentDrain;
		}

		const scheduledDrain = Promise.resolve().then(drain);

		currentDrain = scheduledDrain;

		return scheduledDrain;
	};

	return { request };
}
