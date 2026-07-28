import { useState } from "react";
import {
	eraseLocalProfile,
	factoryResetApplication,
} from "../../application/local-data-wipe-client";

export function DangerZone({ userId }: { userId: string }) {
	const [confirmation, setConfirmation] = useState("");
	const [busy, setBusy] = useState(false);

	return (
		<section className="space-y-4 rounded-xl border border-destructive/40 p-4">
			<div>
				<h2 className="font-semibold text-destructive">Zona de peligro</h2>
				<p className="text-sm text-muted-foreground">
					Estas acciones afectan este navegador. No eliminan automáticamente los
					datos de Turso.
				</p>
			</div>

			<label className="space-y-2">
				<span className="text-sm font-medium">
					Escribe BORRAR para habilitar las acciones
				</span>
				<input
					value={confirmation}
					onChange={(event) => setConfirmation(event.target.value)}
					className="h-10 w-full max-w-sm rounded-md border px-3"
				/>
			</label>

			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					disabled={busy || confirmation !== "BORRAR"}
					className="rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive disabled:opacity-50"
					onClick={async () => {
						if (!window.confirm("¿Borrar el perfil local de este usuario?")) {
							return;
						}

						setBusy(true);
						await eraseLocalProfile(userId);
						window.location.assign("/login");
					}}
				>
					Borrar perfil local
				</button>

				<button
					type="button"
					disabled={busy || confirmation !== "BORRAR"}
					className="rounded-md bg-destructive px-3 py-2 text-sm text-destructive-foreground disabled:opacity-50"
					onClick={async () => {
						if (
							!window.confirm("¿Restablecer completamente esta instalación?")
						) {
							return;
						}

						setBusy(true);
						await factoryResetApplication();
						window.location.assign("/login");
					}}
				>
					Restablecer aplicación
				</button>
			</div>
		</section>
	);
}
