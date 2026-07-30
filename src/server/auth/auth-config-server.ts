import { z } from "zod";

const betterAuthRuntimeConfigSchema = z.object({
	baseURL: z.url(),
	secret: z.string().min(32),
	appOrigin: z.url(),
});

export function createBetterAuthRuntimeConfig(input: {
	baseURL: string;
	secret: string;
	appOrigin: string;
}) {
	const config = betterAuthRuntimeConfigSchema.parse(input);

	return {
		baseURL: config.baseURL,
		secret: config.secret,
		trustedOrigins: [config.appOrigin],
	};
}
