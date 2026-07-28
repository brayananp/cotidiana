import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/platform/auth/auth-client";

type RemoteSession = {
	token: string;
	createdAt: string | Date;
	updatedAt: string | Date;
	expiresAt: string | Date;
	ipAddress?: string | null;
	userAgent?: string | null;
};

export function SessionManager({
	currentSessionToken,
}: {
	currentSessionToken: string | undefined;
}) {
	const [sessions, setSessions] = useState<RemoteSession[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const result = await authClient.listSessions();

			if (result.error) {
				setError(result.error.message ?? "No fue posible cargar las sesiones.");
				return;
			}

			setSessions((result.data ?? []) as RemoteSession[]);
		} catch {
			setError("No fue posible cargar las sesiones.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	return (
		<section className="space-y-4 rounded-xl border p-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="font-semibold">Sesiones de la cuenta</h2>
					<p className="text-sm text-muted-foreground">
						Cierra la sesión remota de otros navegadores.
					</p>
				</div>

				<button
					type="button"
					className="rounded-md border px-3 py-2 text-sm"
					onClick={async () => {
						const result = await authClient.revokeOtherSessions();
						if (result.error) {
							setError(
								result.error.message ?? "No fue posible revocar las sesiones.",
							);
							return;
						}
						await load();
					}}
				>
					Cerrar las demás sesiones
				</button>
			</div>

			{loading ? (
				<p className="text-sm">Cargando sesiones…</p>
			) : (
				<div className="space-y-3">
					{sessions.map((session) => {
						const current = session.token === currentSessionToken;

						return (
							<article
								key={session.token}
								className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
							>
								<div>
									<p className="font-medium">
										{describeUserAgent(session.userAgent)}
										{current && " · Sesión actual"}
									</p>
									<p className="text-xs text-muted-foreground">
										{session.ipAddress ?? "IP no disponible"} · Actualizada{" "}
										{formatDate(session.updatedAt)}
									</p>
								</div>

								<button
									type="button"
									disabled={current}
									className="rounded-md border border-destructive/40 px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
									onClick={async () => {
										const result = await authClient.revokeSession({
											token: session.token,
										});

										if (result.error) {
											setError(
												result.error.message ??
													"No fue posible revocar la sesión.",
											);
											return;
										}

										await load();
									}}
								>
									Revocar
								</button>
							</article>
						);
					})}
				</div>
			)}

			{error && <p className="text-sm text-destructive">{error}</p>}
		</section>
	);
}

function describeUserAgent(value: string | null | undefined): string {
	if (!value) {
		return "Navegador desconocido";
	}

	if (/Edg/i.test(value)) return "Microsoft Edge";
	if (/Firefox/i.test(value)) return "Firefox";
	if (/Chrome/i.test(value)) return "Google Chrome";
	if (/Safari/i.test(value)) return "Safari";
	return value.slice(0, 80);
}

function formatDate(value: string | Date): string {
	return new Intl.DateTimeFormat("es-PE", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}
