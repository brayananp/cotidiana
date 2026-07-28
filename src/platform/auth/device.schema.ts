import { z } from "zod";

export const registerDeviceSchema = z.object({
	deviceId: z.uuid(),
	name: z.string().trim().min(1).max(120),
	platform: z.string().trim().max(120).nullable(),
});

export const renameDeviceSchema = z.object({
	deviceId: z.uuid(),
	name: z.string().trim().min(1).max(120),
});

export const revokeDeviceSchema = z.object({
	deviceId: z.uuid(),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

export type RenameDeviceInput = z.infer<typeof renameDeviceSchema>;

export type RevokeDeviceInput = z.infer<typeof revokeDeviceSchema>;
