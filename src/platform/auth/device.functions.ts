import { createServerFn } from "@tanstack/react-start";
import { registerDeviceSchema } from "./device.schema";

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
