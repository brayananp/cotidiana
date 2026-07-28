import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import * as authSchema from "@/server/database/schema/auth.schema";
import { db } from "../database/client.server";

export const auth = betterAuth({
	appName: "Personal Productivity OS",
	baseURL: process.env.SERVER_URL ?? "",
	secret: process.env.BETTER_AUTH_SECRET ?? "",
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
	trustedOrigins: [process.env.APP_ORIGIN ?? "http://localhost:3000"],
	plugins: [tanstackStartCookies()],
});

export type ServerAuthSession = typeof auth.$Infer.Session;
