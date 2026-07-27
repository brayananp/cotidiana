import { z } from "zod";

export const registerDeviceSchema = z.object({
	deviceId: z.uuid(),
	name: z.string().trim().min(1).max(120),
	platform: z.string().trim().max(120).nullable(),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
