import { useState } from "react";
import { authClient } from "@/platform/auth/auth-client";

export function PasswordChangeForm() {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [revokeOthers, setRevokeOthers] = useState(true);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	return (
		<form
			className="space-y-4 rounded-xl border p-4"
			onSubmit={async (event) => {
				event.preventDefault();
				setError(null);
				setMessage(null);

				if (newPassword !== confirmPassword) {
					setError("Las contraseñas nuevas no coinciden.");
					return;
				}

				if (newPassword.length < 12) {
					setError("La contraseña nueva debe tener al menos 12 caracteres.");
					return;
				}

				setBusy(true);

				try {
					const result = await authClient.changePassword({
						currentPassword,
						newPassword,
						revokeOtherSessions: revokeOthers,
					});

					if (result.error) {
						setError(
							result.error.message ?? "No fue posible cambiar la contraseña.",
						);
						return;
					}

					setCurrentPassword("");
					setNewPassword("");
					setConfirmPassword("");
					setMessage("Contraseña actualizada.");
				} catch {
					setError("No fue posible cambiar la contraseña.");
				} finally {
					setBusy(false);
				}
			}}
		>
			<div>
				<h2 className="font-semibold">Cambiar contraseña</h2>
				<p className="text-sm text-muted-foreground">
					Esta contraseña protege la cuenta remota de Better Auth.
				</p>
			</div>

			<div className="grid gap-3 md:grid-cols-3">
				<PasswordInput
					label="Contraseña actual"
					autoComplete="current-password"
					value={currentPassword}
					onChange={setCurrentPassword}
				/>

				<PasswordInput
					label="Contraseña nueva"
					autoComplete="new-password"
					value={newPassword}
					onChange={setNewPassword}
				/>

				<PasswordInput
					label="Confirmar contraseña"
					autoComplete="new-password"
					value={confirmPassword}
					onChange={setConfirmPassword}
				/>
			</div>

			<label className="flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					checked={revokeOthers}
					onChange={(event) => setRevokeOthers(event.target.checked)}
				/>
				Cerrar las demás sesiones después del cambio
			</label>

			{message && <p className="text-sm text-emerald-600">{message}</p>}

			{error && <p className="text-sm text-destructive">{error}</p>}

			<button
				type="submit"
				disabled={
					busy ||
					!currentPassword ||
					newPassword.length < 12 ||
					newPassword !== confirmPassword
				}
				className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
			>
				{busy ? "Actualizando…" : "Cambiar contraseña"}
			</button>
		</form>
	);
}

function PasswordInput({
	label,
	autoComplete,
	value,
	onChange,
}: {
	label: string;
	autoComplete: "current-password" | "new-password";
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<label className="space-y-2">
			<span className="text-sm font-medium">{label}</span>
			<input
				type="password"
				autoComplete={autoComplete}
				value={value}
				maxLength={128}
				onChange={(event) => onChange(event.target.value)}
				className="h-10 w-full rounded-md border px-3"
			/>
		</label>
	);
}
