import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import {
	changeLocalPin,
	disableLocalPin,
	enableLocalPin,
	getLocalSecurityProfile,
	updateLocalLockPreferences,
} from "../../application/local-lock.service-client";
import { requestAppLock } from "../../application/local-lock-state-client";

export function LocalLockSettings({ userId }: { userId: string }) {
	const profile = useLiveQuery(() => getLocalSecurityProfile(userId), [userId]);

	const [pin, setPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [currentPin, setCurrentPin] = useState("");
	const [newPin, setNewPin] = useState("");
	const [autoLockMinutes, setAutoLockMinutes] = useState(15);
	const [lockOnBackground, setLockOnBackground] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	if (!profile) {
		return <p>Cargando bloqueo local…</p>;
	}

	const run = async (operation: () => Promise<void>) => {
		setBusy(true);
		setError(null);
		setMessage(null);

		try {
			await operation();
			setMessage("Configuración guardada.");
			setPin("");
			setConfirmPin("");
			setCurrentPin("");
			setNewPin("");
		} catch (caught) {
			setError(mapSecurityError(caught));
		} finally {
			setBusy(false);
		}
	};

	return (
		<section className="space-y-5 rounded-xl border p-4">
			<div>
				<h2 className="font-semibold">Bloqueo local</h2>
				<p className="text-sm text-muted-foreground">
					Protege la interfaz en este navegador. No cifra IndexedDB.
				</p>
			</div>

			{!profile.enabled ? (
				<div className="space-y-4">
					<div className="grid gap-3 md:grid-cols-2">
						<PinInput label="Nuevo PIN" value={pin} onChange={setPin} />

						<PinInput
							label="Confirmar PIN"
							value={confirmPin}
							onChange={setConfirmPin}
						/>

						<AutoLockSelect
							value={autoLockMinutes}
							onChange={setAutoLockMinutes}
						/>

						<label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
							<input
								type="checkbox"
								checked={lockOnBackground}
								onChange={(event) => setLockOnBackground(event.target.checked)}
							/>
							Bloquear al ocultar la aplicación
						</label>
					</div>

					<button
						type="button"
						disabled={busy || pin !== confirmPin || pin.length < 6}
						className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
						onClick={() =>
							void run(() =>
								enableLocalPin({
									userId,
									pin,
									preferences: {
										autoLockMinutes,
										lockOnBackground,
									},
								}),
							)
						}
					>
						Activar bloqueo
					</button>
				</div>
			) : (
				<div className="space-y-5">
					<div className="grid gap-3 md:grid-cols-2">
						<AutoLockSelect
							value={profile.autoLockMinutes}
							onChange={(value) =>
								void run(() =>
									updateLocalLockPreferences({
										userId,
										preferences: {
											autoLockMinutes: value,
											lockOnBackground: profile.lockOnBackground,
										},
									}),
								)
							}
						/>

						<label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
							<input
								type="checkbox"
								checked={profile.lockOnBackground}
								onChange={(event) =>
									void run(() =>
										updateLocalLockPreferences({
											userId,
											preferences: {
												autoLockMinutes: profile.autoLockMinutes,
												lockOnBackground: event.target.checked,
											},
										}),
									)
								}
							/>
							Bloquear al ocultar la aplicación
						</label>
					</div>

					<div className="grid gap-3 md:grid-cols-2">
						<PinInput
							label="PIN actual"
							value={currentPin}
							onChange={setCurrentPin}
						/>

						<PinInput label="PIN nuevo" value={newPin} onChange={setNewPin} />
					</div>

					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							className="rounded-md border px-3 py-2 text-sm"
							onClick={() => requestAppLock()}
						>
							Bloquear ahora
						</button>

						<button
							type="button"
							disabled={busy || currentPin.length < 6 || newPin.length < 6}
							className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
							onClick={() =>
								void run(() =>
									changeLocalPin({
										userId,
										currentPin,
										newPin,
									}),
								)
							}
						>
							Cambiar PIN
						</button>

						<button
							type="button"
							disabled={busy || currentPin.length < 6}
							className="rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive disabled:opacity-50"
							onClick={() =>
								void run(() =>
									disableLocalPin({
										userId,
										currentPin,
									}),
								)
							}
						>
							Desactivar bloqueo
						</button>
					</div>
				</div>
			)}

			{message && <p className="text-sm text-emerald-600">{message}</p>}

			{error && <p className="text-sm text-destructive">{error}</p>}
		</section>
	);
}

function PinInput({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<label className="space-y-2">
			<span className="text-sm font-medium">{label}</span>
			<input
				type="password"
				inputMode="numeric"
				autoComplete="off"
				value={value}
				maxLength={12}
				onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
				className="h-10 w-full rounded-md border px-3"
			/>
		</label>
	);
}

function AutoLockSelect({
	value,
	onChange,
}: {
	value: number;
	onChange: (value: number) => void;
}) {
	return (
		<label className="space-y-2">
			<span className="text-sm font-medium">Bloqueo por inactividad</span>
			<select
				value={value}
				onChange={(event) => onChange(Number(event.target.value))}
				className="h-10 w-full rounded-md border px-3"
			>
				<option value={0}>Desactivado</option>
				<option value={1}>1 minuto</option>
				<option value={5}>5 minutos</option>
				<option value={15}>15 minutos</option>
				<option value={30}>30 minutos</option>
				<option value={60}>1 hora</option>
			</select>
		</label>
	);
}

function mapSecurityError(error: unknown): string {
	if (!(error instanceof Error)) {
		return "No fue posible guardar la configuración.";
	}

	const messages: Record<string, string> = {
		CURRENT_PIN_INVALID: "El PIN actual es incorrecto.",
		WEB_CRYPTO_UNAVAILABLE: "Web Crypto no está disponible en este contexto.",
	};

	return messages[error.message] ?? error.message;
}
