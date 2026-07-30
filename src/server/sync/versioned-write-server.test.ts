import { describe, expect, it, vi } from "vitest";
import { attemptVersionedWrite } from "./versioned-write-server";

describe("versioned server write", () => {
	it("returns the current row when another writer wins the expected version", async () => {
		const current = { id: "task-1", version: 3 };
		const loadCurrent = vi.fn(async () => current);

		const result = await attemptVersionedWrite({
			expectedVersion: 2,
			writeIfVersion: async () => null,
			loadCurrent,
		});

		expect(result).toEqual({
			status: "stale",
			current,
		});
	});

	it("does not reload when the conditional write succeeds", async () => {
		const loadCurrent = vi.fn(async () => ({ id: "task-1", version: 3 }));

		const result = await attemptVersionedWrite({
			expectedVersion: 2,
			writeIfVersion: async (expectedVersion) => ({
				id: "task-1",
				version: expectedVersion + 1,
			}),
			loadCurrent,
		});

		expect(result).toEqual({
			status: "written",
			row: { id: "task-1", version: 3 },
		});
		expect(loadCurrent).not.toHaveBeenCalled();
	});
});
