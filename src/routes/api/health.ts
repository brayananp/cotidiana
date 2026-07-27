import { createFileRoute } from "@tanstack/react-router";
import { tursoClient } from "@/server/database/client.server";

export const Route = createFileRoute("/api/health")({
	server: {
		handlers: {
			GET: async () => {
				try {
					await tursoClient.execute("select 1 as ok");

					return Response.json(
						{
							status: "ok",
							database: "available",
							timestamp: new Date().toISOString(),
						},
						{
							headers: {
								"cache-control": "no-store",
							},
						},
					);
				} catch {
					return Response.json(
						{
							status: "degraded",
							database: "unavailable",
							timestamp: new Date().toISOString(),
						},
						{
							status: 503,
							headers: {
								"cache-control": "no-store",
							},
						},
					);
				}
			},
		},
	},
});
