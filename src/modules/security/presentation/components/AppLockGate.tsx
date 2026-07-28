import { useLiveQuery } from "dexie-react-hooks";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import type { AppAccess } from "@/platform/auth/app-access.types";
import {
	getLocalSecurityProfile,
	verifyLocalPin,
} from "../../application/local-lock.service-client";
import {
	initializeAppLock,
	requestAppLock,
	updateAppLockConfig,
} from "../../application/local-lock-state-client";
import { useAppLock } from "../../application/use-app-lock";

export function AppLockGate({
	access,
	children,
}: {
	access: AppAccess;
	children: ReactNode;
}) {
	const identity = access.localIdentity;
	const identityUserId = identity?.userId;
	const lock = useAppLock();

	const profile = useLiveQuery(
		async () => {
			if (!identityUserId) {
				return null;
			}

			return getLocalSecurityProfile(identityUserId);
		},
		[identityUserId],
		undefined,
	);

	useEffect(() => {
		if (!identityUserId || profile === undefined) {
			return;
		}

		if (!profile) {
			initializeAppLock({
				userId: identityUserId,
				enabled: false,
				lockedUntil: null,
			});
			return;
		}

		if (!lock.initialized || lock.userId !== identityUserId) {
			initializeAppLock({
				userId: identityUserId,
				enabled: profile.enabled,
				lockedUntil: profile.lockedUntil,
			});
			return;
		}

		updateAppLockConfig({
			enabled: profile.enabled,
			lockedUntil: profile.lockedUntil,
		});
	}, [identityUserId, profile, lock.initialized, lock.userId]);

	useAutoLock(profile, lock.locked);

	if (!identity) {
		return <>{children}</>;
	}

	if (profile === undefined || !lock.initialized) {
		return (
			<div className="grid min-h-screen place-items-center">
				<output className="text-sm text-muted-foreground">
					Preparando seguridad local…
				</output>
			</div>
		);
	}

	if (profile?.enabled && lock.locked) {
		return (
			<UnlockScreen
				userId={identity.userId}
				email={identity.email}
				lockedUntil={lock.lockedUntil}
			/>
		);
	}

	return <>{children}</>;
}

function useAutoLock(
	profile:
		| Awaited<ReturnType<typeof getLocalSecurityProfile>>
		| null
		| undefined,
	locked: boolean,
): void {
	const timer = useRef<number | null>(null);

	const timeoutMs = useMemo(
		() =>
			profile?.enabled && profile.autoLockMinutes > 0
				? profile.autoLockMinutes * 60_000
				: 0,
		[profile?.enabled, profile?.autoLockMinutes],
	);

	useEffect(() => {
		if (!profile?.enabled || locked) {
			if (timer.current !== null) {
				window.clearTimeout(timer.current);
				timer.current = null;
			}
			return;
		}

		const resetTimer = () => {
			if (timer.current !== null) {
				window.clearTimeout(timer.current);
			}

			if (timeoutMs > 0) {
				timer.current = window.setTimeout(() => requestAppLock(), timeoutMs);
			}
		};

		const handleVisibility = () => {
			if (document.visibilityState === "hidden" && profile.lockOnBackground) {
				requestAppLock();
				return;
			}

			resetTimer();
		};

		const activityEvents = [
			"pointerdown",
			"keydown",
			"touchstart",
			"wheel",
		] as const;

		for (const eventName of activityEvents) {
			window.addEventListener(eventName, resetTimer, { passive: true });
		}

		document.addEventListener("visibilitychange", handleVisibility);

		resetTimer();

		return () => {
			if (timer.current !== null) {
				window.clearTimeout(timer.current);
			}

			for (const eventName of activityEvents) {
				window.removeEventListener(eventName, resetTimer);
			}

			document.removeEventListener("visibilitychange", handleVisibility);
		};
	}, [profile?.enabled, profile?.lockOnBackground, timeoutMs, locked]);
}

function UnlockScreen({
	userId,
	email,
	lockedUntil,
}: {
	userId: string;
	email: string;
	lockedUntil: string | null;
}) {
	const [pin, setPin] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		if (!lockedUntil) {
			return;
		}

		const interval = window.setInterval(() => setNow(Date.now()), 1_000);

		return () => window.clearInterval(interval);
	}, [lockedUntil]);

	const secondsRemaining = lockedUntil
		? Math.max(0, Math.ceil((new Date(lockedUntil).getTime() - now) / 1_000))
		: 0;

	const submit = async () => {
		setError(null);
		setSubmitting(true);

		try {
			const result = await verifyLocalPin({
				userId,
				pin,
			});

			if (!result.ok) {
				setError(
					result.lockedUntil
						? "Demasiados intentos. Espera antes de volver a probar."
						: "PIN incorrecto.",
				);
			}
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: "No fue posible verificar el PIN.",
			);
		} finally {
			setSubmitting(false);
			setPin("");
		}
	};

	return (
		<main className="grid min-h-screen place-items-center bg-background p-6">
			<form
				className="w-full max-w-sm space-y-5 rounded-2xl border bg-background p-6 shadow-xl"
				onSubmit={(event) => {
					event.preventDefault();
					void submit();
				}}
			>
				<div>
					<h1 className="text-xl font-semibold">Aplicación bloqueada</h1>
					<p className="mt-1 text-sm text-muted-foreground">{email}</p>
				</div>

				<label className="space-y-2">
					<span className="text-sm font-medium">PIN local</span>
					<input
						inputMode="numeric"
						autoComplete="off"
						pattern="[0-9]*"
						value={pin}
						disabled={secondsRemaining > 0}
						onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
						className="h-12 w-full rounded-md border px-3 text-center text-xl tracking-[0.4em]"
					/>
				</label>

				{secondsRemaining > 0 && (
					<p className="text-sm text-muted-foreground">
						Intenta nuevamente en {secondsRemaining} segundos.
					</p>
				)}

				{error && (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				)}

				<button
					type="submit"
					disabled={submitting || pin.length < 6 || secondsRemaining > 0}
					className="h-11 w-full rounded-md bg-primary px-4 text-primary-foreground disabled:opacity-50"
				>
					{submitting ? "Verificando…" : "Desbloquear"}
				</button>
			</form>
		</main>
	);
}
