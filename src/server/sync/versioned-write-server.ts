export type VersionedWriteResult<TRow> =
	| {
			status: "written";
			row: TRow;
	  }
	| {
			status: "stale";
			current: TRow | null;
	  };

export async function attemptVersionedWrite<TRow>(input: {
	expectedVersion: number;
	writeIfVersion: (expectedVersion: number) => Promise<TRow | null>;
	loadCurrent: () => Promise<TRow | null>;
}): Promise<VersionedWriteResult<TRow>> {
	const row = await input.writeIfVersion(input.expectedVersion);

	if (row) {
		return {
			status: "written",
			row,
		};
	}

	return {
		status: "stale",
		current: await input.loadCurrent(),
	};
}
