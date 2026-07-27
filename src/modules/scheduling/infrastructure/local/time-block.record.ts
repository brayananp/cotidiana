import type { TimeBlockKind, TimeBlockStatus } from "../../domain/time-block";

export type TimeBlockRecord = {
	id: string;
	userId: string;
	taskId: string | null;
	title: string;
	notes: string | null;
	kind: TimeBlockKind;
	status: TimeBlockStatus;
	startAt: string;
	endAt: string;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	version: number;
};
