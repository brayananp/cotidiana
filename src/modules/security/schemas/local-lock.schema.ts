import { z } from "zod";

export const localPinSchema = z
	.string()
	.regex(/^\d{6,12}$/, "El PIN debe tener entre 6 y 12 dígitos");

export const localLockPreferencesSchema = z.object({
	autoLockMinutes: z.number().int().min(0).max(240),

	lockOnBackground: z.boolean(),
});

export type LocalLockPreferencesInput = z.infer<
	typeof localLockPreferencesSchema
>;
