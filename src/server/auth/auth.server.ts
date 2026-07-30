import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { env } from "@/env";
import * as authSchema from "@/server/database/schema/auth.schema";
import { db } from "../database/client.server";
import { createBetterAuthRuntimeConfig } from "./auth-config-server";

const runtimeConfig = createBetterAuthRuntimeConfig({
	baseURL: env.BETTER_AUTH_URL,
	secret: env.BETTER_AUTH_SECRET,
	appOrigin: env.APP_ORIGIN,
});

export const auth = betterAuth({
	appName: "Personal Productivity OS",
	...runtimeConfig,
	database: drizzleAdapter(db, {
		provider: "sqlite",
		schema: authSchema,
	}),
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 12,
		maxPasswordLength: 128,
		revokeSessionsOnPasswordReset: true,
	},
	advanced: {
		database: {
			generateId: "uuid",
		},
	},
	plugins: [tanstackStartCookies()],
});

export type ServerAuthSession = typeof auth.$Infer.Session;
