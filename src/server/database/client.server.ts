import { env } from "#/env";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

type TursoClient = ReturnType<typeof createClient>;

const globalDatabase = globalThis as unknown as {
	tursoClient?: TursoClient;
};

export const tursoClient =
	globalDatabase.tursoClient ??
	createClient({
		url: env.TURSO_DATABASE_URL,
		authToken: env.TURSO_AUTH_TOKEN,
	});

if (process.env.NODE_ENV !== "production") {
	globalDatabase.tursoClient = tursoClient;
}

export const db = drizzle({
	client: tursoClient,
	connection: {
		url: env.TURSO_DATABASE_URL,
		authToken: env.TURSO_AUTH_TOKEN,
	},
});
