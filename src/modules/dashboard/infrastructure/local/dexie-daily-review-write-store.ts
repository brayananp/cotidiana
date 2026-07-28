import { getLocalDatabase } from "@/platform/database/local-database";
import { requestDailyReviewSync } from "@/platform/sync/daily-review-sync-events-client";
import {
	createSyncMetadataId,
	type SyncMetadataRecord,
	type SyncOperationRecord,
	type SyncOperationType,
} from "@/platform/sync/sync.types";
import type { DailyReviewWriteStore } from "../../application/ports/daily-review-write-store";
import type { DailyReview } from "../../domain/daily-review";
import { dailyReviewToRecord } from "./daily-review.mapper";

export class DexieDailyReviewWriteStore implements DailyReviewWriteStore {
	async commit(
		review: DailyReview,
		requestedOperation: SyncOperationType,
		deviceId: string,
	): Promise<void> {
		const db = getLocalDatabase();

		await db.transaction(
			"rw",
			db.dailyReviews,
			db.syncOperations,
			db.syncMetadata,
			async () => {
				const existingOperations = await db.syncOperations
					.where("[entityType+entityId]")
					.equals(["daily_review", review.id])
					.toArray();

				const compactable = existingOperations.filter(
					(operation) =>
						operation.status === "pending" && operation.attempts === 0,
				);
				const hasCreate = compactable.some(
					(operation) => operation.operation === "create",
				);
				const operationType =
					hasCreate && requestedOperation === "update"
						? "create"
						: requestedOperation;

				const metadataId = createSyncMetadataId("daily_review", review.id);
				const existingMetadata = await db.syncMetadata.get(metadataId);
				const now = new Date().toISOString();
				const operationId = crypto.randomUUID();

				const operation: SyncOperationRecord = {
					id: operationId,
					userId: review.userId,
					deviceId,
					entityType: "daily_review",
					entityId: review.id,
					operation: operationType,
					payload:
						operationType === "delete"
							? {
									id: review.id,
									deletedAt: review.deletedAt,
									version: review.version,
								}
							: review,
					baseVersion:
						operationType === "create"
							? null
							: (existingMetadata?.remoteVersion ?? null),
					status: "pending",
					attempts: 0,
					nextRetryAt: null,
					lastError: null,
					createdAt: compactable[0]?.createdAt ?? now,
					updatedAt: now,
				};

				const metadata: SyncMetadataRecord = {
					id: metadataId,
					entityType: "daily_review",
					entityId: review.id,
					localVersion: review.version,
					remoteVersion: existingMetadata?.remoteVersion ?? null,
					state: "pending",
					lastSyncedAt: existingMetadata?.lastSyncedAt ?? null,
					lastError: null,
					updatedAt: now,
				};

				await db.dailyReviews.put(dailyReviewToRecord(review));
				if (compactable.length) {
					await db.syncOperations.bulkDelete(
						compactable.map((item) => item.id),
					);
				}
				await db.syncOperations.put(operation);
				await db.syncMetadata.put(metadata);
			},
		);

		requestDailyReviewSync();
	}
}
