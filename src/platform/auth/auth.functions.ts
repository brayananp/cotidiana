import { createServerFn } from "@tanstack/react-start";

export const getRemoteSession = createServerFn({
	method: "GET",
}).handler(async () => {
	const { getServerSession } = await import(
		"@/server/auth/require-session.server"
	);

	return getServerSession();
});
