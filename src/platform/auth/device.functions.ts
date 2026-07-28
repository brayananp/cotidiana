import { createServerFn } from "@tanstack/react-start";
import {
	registerDeviceSchema,
	renameDeviceSchema,
	revokeDeviceSchema,
} from "./device.schema";

export const registerCurrentDevice = createServerFn({
	method: "POST",
})
	.validator(registerDeviceSchema)
	.handler(async ({ data }) => {
		const [{ requireServerSession }, { registerDeviceForUser }] =
			await Promise.all([
				import("@/server/auth/require-session.server"),
				import("@/server/devices/device.repository.server"),
			]);

		const session = await requireServerSession();
		const registered = await registerDeviceForUser(session.user.id, data);

		return {
			id: registered.id,
			registeredAt: registered.updatedAt.toISOString(),
		};
	});

export const listRegisteredDevices = createServerFn({
	method: "GET",
}).handler(async () => {
	const [{ requireServerSession }, { listDevicesForUser }] = await Promise.all([
		import("@/server/auth/require-session.server"),
		import("@/server/devices/device.repository.server"),
	]);

	const session = await requireServerSession();
	const devices = await listDevicesForUser(session.user.id);

	return devices.map((item) => ({
		id: item.id,
		name: item.name,
		platform: item.platform,
		createdAt: item.createdAt.toISOString(),
		updatedAt: item.updatedAt.toISOString(),
		lastSeenAt: item.lastSeenAt.toISOString(),
		revokedAt: item.revokedAt?.toISOString() ?? null,
	}));
});

export const renameRegisteredDevice = createServerFn({
	method: "POST",
})
	.validator(renameDeviceSchema)
	.handler(async ({ data }) => {
		const [{ requireServerSession }, { renameDeviceForUser }] =
			await Promise.all([
				import("@/server/auth/require-session.server"),
				import("@/server/devices/device.repository.server"),
			]);

		const session = await requireServerSession();
		const updated = await renameDeviceForUser(session.user.id, data);

		return {
			id: updated.id,
			name: updated.name,
			updatedAt: updated.updatedAt.toISOString(),
		};
	});

export const revokeRegisteredDevice = createServerFn({
	method: "POST",
})
	.validator(revokeDeviceSchema)
	.handler(async ({ data }) => {
		const [{ requireServerSession }, { revokeDeviceForUser }] =
			await Promise.all([
				import("@/server/auth/require-session.server"),
				import("@/server/devices/device.repository.server"),
			]);

		const session = await requireServerSession();
		const revoked = await revokeDeviceForUser(session.user.id, data.deviceId);

		return {
			id: revoked.id,
			revokedAt: revoked.revokedAt?.toISOString() ?? null,
		};
	});
