import { registerCurrentDevice } from "@/platform/auth/device.functions";
import { getLocalDatabase } from "@/platform/database/local-database";

type DeviceRegistrationInput = {
	userId: string;
	deviceId: string;
};

type LocalDeviceSnapshot = {
	id: string;
	name: string;
	platform: string | null;
};

type DeviceRegistrationDependencies = {
	loadDevice: (deviceId: string) => Promise<LocalDeviceSnapshot | null>;
	registerDevice: (
		device: LocalDeviceSnapshot,
	) => Promise<{ registeredAt: string }>;
	markRegistered: (userId: string, registeredAt: string) => Promise<void>;
};

export type DeviceRegistrationClient = {
	ensure: (input: DeviceRegistrationInput) => Promise<string>;
};

export function createDeviceRegistrationClient(
	dependencies: DeviceRegistrationDependencies,
): DeviceRegistrationClient {
	const registrations = new Map<string, Promise<string>>();

	const execute = async (input: DeviceRegistrationInput): Promise<string> => {
		const device = await dependencies.loadDevice(input.deviceId);

		if (!device) {
			throw new Error("LOCAL_DEVICE_NOT_FOUND");
		}

		const registration = await dependencies.registerDevice(device);

		await dependencies.markRegistered(input.userId, registration.registeredAt);

		return registration.registeredAt;
	};

	const ensure = (input: DeviceRegistrationInput): Promise<string> => {
		const key = `${input.userId}:${input.deviceId}`;
		const existing = registrations.get(key);

		if (existing) {
			return existing;
		}

		const registration = execute(input);
		registrations.set(key, registration);

		void registration.catch(() => {
			if (registrations.get(key) === registration) {
				registrations.delete(key);
			}
		});

		return registration;
	};

	return { ensure };
}

const deviceRegistrationClient = createDeviceRegistrationClient({
	loadDevice: async (deviceId) => {
		const device = await getLocalDatabase().localDevices.get(deviceId);

		return device
			? {
					id: device.id,
					name: device.name,
					platform: device.platform,
				}
			: null;
	},
	registerDevice: async (device) =>
		registerCurrentDevice({
			data: {
				deviceId: device.id,
				name: device.name,
				platform: device.platform,
			},
		}),
	markRegistered: async (userId, registeredAt) => {
		const db = getLocalDatabase();
		const identity = await db.localIdentities.get(userId);

		if (!identity) {
			return;
		}

		await db.localIdentities.update(identity.id, {
			remoteRegisteredAt: registeredAt,
			updatedAt: new Date().toISOString(),
		});
	},
});

export const ensureRemoteDeviceRegistered = deviceRegistrationClient.ensure;
