import { describe, expect, it } from "vitest";
import {
	createPinVerifier,
	verifyPinVerifier,
} from "../application/local-lock.crypto-client";

describe("local PIN verifier", () => {
	it("verifica el PIN correcto y rechaza otro", async () => {
		const verifier = await createPinVerifier("482915", 1_000);

		await expect(verifyPinVerifier("482915", verifier)).resolves.toBe(true);

		await expect(verifyPinVerifier("482916", verifier)).resolves.toBe(false);
	});

	it("genera salts diferentes", async () => {
		const first = await createPinVerifier("482915", 1_000);

		const second = await createPinVerifier("482915", 1_000);

		expect(first.salt).not.toBe(second.salt);

		expect(first.hash).not.toBe(second.hash);
	});
});
