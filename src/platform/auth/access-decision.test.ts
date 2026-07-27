import { describe, expect, it } from "vitest";
import { decideAppAccess } from "./access-decision";
const localIdentity = {
	userId: "user-1",
	deviceId: "00000000-0000-4000-8000-000000000001",
	name: "Alexis",
	email: "alexis@example.com",
	offlineAccessEnabled: true,
	initializedAt: "2026-07-26T00:00:00.000Z",
	lastAuthenticatedAt: "2026-07-26T00:00:00.000Z",
};

const remoteSession = {
	user: {
		id: "user-1",
		name: "Alexis",
		email: "alexis@example.com",
		emailVerified: false,
		image: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	},
	session: {
		id: "session-1",
		userId: "user-1",
		token: "token",
		expiresAt: new Date("2026-08-01T00:00:00.000Z"),
		createdAt: new Date(),
		updatedAt: new Date(),
		ipAddress: null,
		userAgent: null,
	},
};

describe("decideAppAccess", () => {
	it("permite acceso remoto y sincronización", () => {
		const result = decideAppAccess({
			localIdentity,
			browserReportsOnline: true,
			serverAvailable: true,
			remoteSession,
		});

		expect(result.mode).toBe("remote_authenticated");
		expect(result.canSynchronize).toBe(true);
	});

	it("permite acceso local sin conexión", () => {
		const result = decideAppAccess({
			localIdentity,
			browserReportsOnline: false,
			serverAvailable: false,
			remoteSession: null,
		});

		expect(result.mode).toBe("local_offline");
		expect(result.canEnterApp).toBe(true);
		expect(result.canSynchronize).toBe(false);
	});

	it("permite acceso si Turso no responde", () => {
		const result = decideAppAccess({
			localIdentity,
			browserReportsOnline: true,
			serverAvailable: false,
			remoteSession: null,
		});

		expect(result.mode).toBe("local_remote_unavailable");
	});

	it("requiere reautenticación con sesión expirada", () => {
		const result = decideAppAccess({
			localIdentity,
			browserReportsOnline: true,
			serverAvailable: true,
			remoteSession: null,
		});

		expect(result.mode).toBe("reauthentication_required");
		expect(result.canEnterApp).toBe(true);
		expect(result.canSynchronize).toBe(false);
	});

	it("rechaza acceso sin identidad ni sesión", () => {
		const result = decideAppAccess({
			localIdentity: null,
			browserReportsOnline: false,
			serverAvailable: false,
			remoteSession: null,
		});

		expect(result.mode).toBe("unauthenticated");
		expect(result.canEnterApp).toBe(false);
	});
});
