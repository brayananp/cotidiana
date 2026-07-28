import { useCallback, useEffect, useState } from "react";
import {
	listRegisteredDevices,
	renameRegisteredDevice,
	revokeRegisteredDevice,
} from "@/platform/auth/device.functions";

type RegisteredDevice = {
	id: string;
	name: string;
	platform: string | null;
	createdAt: string;
	updatedAt: string;
	lastSeenAt: string;
	revokedAt: string | null;
};

export function DeviceManager({
	currentDeviceId,
}: {
	currentDeviceId: string;
}) {
	const [devices, setDevices] = useState<RegisteredDevice[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const result = await listRegisteredDevices();
			setDevices(result as RegisteredDevice[]);
		} catch (caught) {
			setError(getError(caught));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	return (
		<section className="space-y-4 rounded-xl border p-4">
			<div>
				<h2 className="font-semibold">Dispositivos registrados</h2>
				<p className="text-sm text-muted-foreground">
					La revocación detiene futuras sincronizaciones del identificador
					seleccionado.
				</p>
			</div>

			{loading ? (
				<p className="text-sm">Cargando dispositivos…</p>
			) : devices.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					No hay dispositivos registrados.
				</p>
			) : (
				<div className="space-y-3">
					{devices.map((device) => (
						<DeviceRow
							key={device.id}
							device={device}
							current={device.id === currentDeviceId}
							onChanged={load}
						/>
					))}
				</div>
			)}

			{error && <p className="text-sm text-destructive">{error}</p>}
		</section>
	);
}

function DeviceRow({
	device,
	current,
	onChanged,
}: {
	device: RegisteredDevice;
	current: boolean;
	onChanged: () => Promise<void>;
}) {
	const [name, setName] = useState(device.name);
	const [busy, setBusy] = useState(false);

	return (
		<article className="space-y-3 rounded-lg border p-3">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="font-medium">
						{device.name}{" "}
						{current && (
							<span className="text-xs text-muted-foreground">
								· Este dispositivo
							</span>
						)}
					</p>
					<p className="text-xs text-muted-foreground">
						{device.platform ?? "Plataforma desconocida"} · Último uso{" "}
						{formatDate(device.lastSeenAt)}
					</p>
				</div>

				<span className="rounded-full border px-2 py-1 text-xs">
					{device.revokedAt ? "Revocado" : "Activo"}
				</span>
			</div>

			{!device.revokedAt && (
				<div className="flex flex-wrap gap-2">
					<input
						value={name}
						maxLength={120}
						onChange={(event) => setName(event.target.value)}
						className="h-9 min-w-52 flex-1 rounded-md border px-3 text-sm"
					/>

					<button
						type="button"
						disabled={busy || !name.trim() || name.trim() === device.name}
						className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
						onClick={async () => {
							setBusy(true);
							try {
								await renameRegisteredDevice({
									data: {
										deviceId: device.id,
										name,
									},
								});
								await onChanged();
							} finally {
								setBusy(false);
							}
						}}
					>
						Renombrar
					</button>

					<button
						type="button"
						disabled={busy || current}
						title={
							current
								? "Usa la zona de peligro para borrar este dispositivo."
								: undefined
						}
						className="rounded-md border border-destructive/40 px-3 py-1.5 text-sm text-destructive disabled:opacity-50"
						onClick={async () => {
							if (!window.confirm("¿Revocar este dispositivo?")) {
								return;
							}

							setBusy(true);
							try {
								await revokeRegisteredDevice({
									data: {
										deviceId: device.id,
									},
								});
								await onChanged();
							} finally {
								setBusy(false);
							}
						}}
					>
						Revocar
					</button>
				</div>
			)}
		</article>
	);
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat("es-PE", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

function getError(error: unknown): string {
	return error instanceof Error
		? error.message
		: "No fue posible cargar los dispositivos.";
}
