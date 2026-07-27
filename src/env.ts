import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		SERVER_URL: z.url().optional(),
		BETTER_AUTH_URL: z.url().optional(),
		BETTER_AUTH_SECRET: z.string().min(1),
		APP_ORIGIN: z.url().optional(),
		TURSO_DATABASE_URL: z.string(),
		TURSO_AUTH_TOKEN: z.string(),
	},

	/**
	 * The prefix that client-side variables must have. This is enforced both at
	 * a type-level and at runtime.
	 */
	clientPrefix: "VITE_",

	client: {
		VITE_APP_TITLE: z.string().min(1).optional(),
	},

	/**
	 * What object holds the environment variables at runtime. This is usually
	 * `process.env` or `import.meta.env`.
	 */
	runtimeEnv: {
		BETTER_AUTH_URL:
			process.env.BETTER_AUTH_URL ?? "http://localhost:3000/api/auth",
		BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "secret",
		APP_ORIGIN: process.env.APP_ORIGIN ?? "http://localhost:3000",
		SERVER_URL: process.env.SERVER_URL ?? "http://localhost:3000",
		TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ?? "",
		TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ?? "",
	},

	/**
	 * By default, this library will feed the environment variables directly to
	 * the Zod validator.
	 *
	 * This means that if you have an empty string for a value that is supposed
	 * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
	 * it as a type mismatch violation. Additionally, if you have an empty string
	 * for a value that is supposed to be a string with a default value (e.g.
	 * `DOMAIN=` in an ".env" file), the default value will never be applied.
	 *
	 * In order to solve these issues, we recommend that all new projects
	 * explicitly specify this option as true.
	 */
	emptyStringAsUndefined: true,
});
