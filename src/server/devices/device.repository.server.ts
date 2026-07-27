import type { RegisterDeviceInput } from "#/platform/auth/device.schema";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/database/client.server";
import { device } from "@/server/database/schema/device.schema";

export async function registerDeviceForUser(
	userId: string,
	input: RegisterDeviceInput,
) {
	const [existing] = await db
		.select()
		.from(device)
		.where(eq(device.id, input.deviceId))
		.limit(1);

	const now = new Date();

	if (existing && existing.userId !== userId) {
		throw new Error("DEVICE_ID_ALREADY_ASSIGNED");
	}

	if (existing) {
		const [updated] = await db
			.update(device)
			.set({
				name: input.name,
				platform: input.platform,
				lastSeenAt: now,
				updatedAt: now,
				revokedAt: null,
			})
			.where(and(eq(device.id, input.deviceId), eq(device.userId, userId)))
			.returning();

		if (!updated) {
			throw new Error("DEVICE_UPDATE_FAILED");
		}

		return updated;
	}

	const [created] = await db
		.insert(device)
		.values({
			id: input.deviceId,
			userId,
			name: input.name,
			platform: input.platform,
			lastSeenAt: now,
			updatedAt: now,
		})
		.returning();

	if (!created) {
		throw new Error("DEVICE_CREATION_FAILED");
	}

	return created;
}
