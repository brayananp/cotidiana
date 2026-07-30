import { describe, expect, it, vi } from "vitest";
import { createDeviceRegistrationClient } from "./device-registration-client";

const input = {
	userId: "user-1",
	deviceId: "device-1",
};

function createDeferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;

	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});

	return { promise, resolve, reject };
}

describe("device registration client", () => {
	it("registers a local device and records the remote timestamp", async () => {
		const markRegistered = vi.fn(async () => undefined);
		const client = createDeviceRegistrationClient({
			loadDevice: async () => ({
				id: "device-1",
				name: "Laptop",
				platform: "Windows",
			}),
			registerDevice: async () => ({
				registeredAt: "2026-07-29T20:00:00.000Z",
			}),
			markRegistered,
		});

		const registeredAt = await client.ensure(input);

		expect(registeredAt).toBe("2026-07-29T20:00:00.000Z");
		expect(markRegistered).toHaveBeenCalledWith(
			"user-1",
			"2026-07-29T20:00:00.000Z",
		);
	});

	it("shares one registration between concurrent callers", async () => {
		const registration = createDeferred<{ registeredAt: string }>();
		const registerDevice = vi.fn(() => registration.promise);
		const client = createDeviceRegistrationClient({
			loadDevice: async () => ({
				id: "device-1",
				name: "Laptop",
				platform: null,
			}),
			registerDevice,
			markRegistered: async () => undefined,
		});

		const first = client.ensure(input);
		const second = client.ensure(input);

		expect(second).toBe(first);
		expect(registerDevice).toHaveBeenCalledTimes(0);

		await Promise.resolve();
		expect(registerDevice).toHaveBeenCalledTimes(1);

		registration.resolve({ registeredAt: "2026-07-29T20:00:00.000Z" });
		await Promise.all([first, second]);

		await client.ensure(input);
		expect(registerDevice).toHaveBeenCalledTimes(1);
	});

	it("allows a later retry when registration fails", async () => {
		const error = new Error("network unavailable");
		const registerDevice = vi
			.fn()
			.mockRejectedValueOnce(error)
			.mockResolvedValue({
				registeredAt: "2026-07-29T20:00:00.000Z",
			});
		const client = createDeviceRegistrationClient({
			loadDevice: async () => ({
				id: "device-1",
				name: "Laptop",
				platform: null,
			}),
			registerDevice,
			markRegistered: async () => undefined,
		});

		await expect(client.ensure(input)).rejects.toBe(error);
		await expect(client.ensure(input)).resolves.toBe(
			"2026-07-29T20:00:00.000Z",
		);

		expect(registerDevice).toHaveBeenCalledTimes(2);
	});

	it("rejects when the local device no longer exists", async () => {
		const client = createDeviceRegistrationClient({
			loadDevice: async () => null,
			registerDevice: vi.fn(),
			markRegistered: vi.fn(),
		});

		await expect(client.ensure(input)).rejects.toThrow(
			"LOCAL_DEVICE_NOT_FOUND",
		);
	});
});
