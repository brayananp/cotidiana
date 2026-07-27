import { authClient } from "@/platform/auth/auth-client";
import { provisionLocalAccess } from "@/platform/auth/local-access.service";

export async function completeAuthentication(): Promise<void> {
	const sessionResult = await authClient.getSession();

	if (sessionResult.error || !sessionResult.data) {
		throw new Error(
			"La sesión fue creada, pero no pudo inicializarse el acceso local.",
		);
	}

	await provisionLocalAccess(sessionResult.data);
}
