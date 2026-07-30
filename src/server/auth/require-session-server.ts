import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "./auth-server";

export async function getServerSession() {
	return auth.api.getSession({
		headers: getRequestHeaders(),
	});
}

export async function requireServerSession() {
	const session = await getServerSession();

	if (!session) {
		throw new Error("AUTH_REQUIRED");
	}

	return session;
}
