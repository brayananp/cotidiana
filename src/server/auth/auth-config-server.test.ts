import { describe, expect, it } from "vitest";
import { createBetterAuthRuntimeConfig } from "./auth-config-server";

describe("Better Auth runtime configuration", () => {
	it("rejects a low-entropy secret instead of starting insecurely", () => {
		expect(() =>
			createBetterAuthRuntimeConfig({
				baseURL: "http://localhost:3000",
				secret: "secret",
				appOrigin: "http://localhost:3000",
			}),
		).toThrow();
	});

	it("returns validated URLs and a high-entropy secret", () => {
		const config = createBetterAuthRuntimeConfig({
			baseURL: "https://cotidiana.example.com",
			secret: "a".repeat(32),
			appOrigin: "https://cotidiana.example.com",
		});

		expect(config).toEqual({
			baseURL: "https://cotidiana.example.com",
			secret: "a".repeat(32),
			trustedOrigins: ["https://cotidiana.example.com"],
		});
	});
});
