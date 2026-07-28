import { useRouteContext } from "@tanstack/react-router";
import { DangerZone } from "../components/DangerZone";
import { DeviceManager } from "../components/DeviceManager";
import { LocalLockSettings } from "../components/LocalLockSettings";
import { PasswordChangeForm } from "../components/PasswordChangeForm";
import { SessionManager } from "../components/SessionManager";

export function SecuritySettingsPage() {
	const { access } = useRouteContext({
		from: "/_app",
	});

	const identity = access.localIdentity;

	if (!identity) {
		return <p>El dispositivo no tiene una identidad local activa.</p>;
	}

	return (
		<section className="space-y-6">
			<header>
				<h1 className="text-2xl font-semibold">Seguridad</h1>
				<p className="text-sm text-muted-foreground">
					Protege este navegador y administra el acceso remoto a tu cuenta.
				</p>
			</header>

			<LocalLockSettings userId={identity.userId} />

			{access.remoteSession ? (
				<>
					<PasswordChangeForm />

					<SessionManager
						currentSessionToken={access.remoteSession.session.token}
					/>

					<DeviceManager currentDeviceId={identity.deviceId} />
				</>
			) : (
				<div className="rounded-xl border p-4 text-sm text-muted-foreground">
					Inicia sesión y recupera la conexión para administrar contraseña,
					sesiones y dispositivos remotos.
				</div>
			)}

			<DangerZone userId={identity.userId} />
		</section>
	);
}
