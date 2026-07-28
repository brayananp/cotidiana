import Dexie from "dexie";
import { authClient } from "@/platform/auth/auth-client";
import { getLocalDatabase } from "@/platform/database/local-database";

export async function eraseLocalProfile(userId: string): Promise<void> {
	const db = getLocalDatabase();

	const [
		tasks,
		timeBlocks,
		calendarEvents,
		reminders,
		books,
		bookNotes,
		backups,
		operations,
		conflicts,
		cursors,
		runtime,
	] = await Promise.all([
		db.tasks.where("userId").equals(userId).toArray(),
		db.timeBlocks.where("userId").equals(userId).toArray(),
		db.calendarEvents.where("userId").equals(userId).toArray(),
		db.reminders.where("userId").equals(userId).toArray(),
		db.books.where("userId").equals(userId).toArray(),
		db.bookNotes.where("userId").equals(userId).toArray(),
		db.localBackups.where("userId").equals(userId).toArray(),
		db.syncOperations.where("userId").equals(userId).toArray(),
		db.syncConflicts.where("userId").equals(userId).toArray(),
		db.syncCursors.where("userId").equals(userId).toArray(),
		db.syncRuntime.where("userId").equals(userId).toArray(),
	]);

	const entityKeys = [
		...tasks.map((item) => `task:${item.id}`),
		...timeBlocks.map((item) => `time_block:${item.id}`),
		...calendarEvents.map((item) => `calendar_event:${item.id}`),
		...reminders.map((item) => `reminder:${item.id}`),
		...books.map((item) => `book:${item.id}`),
		...bookNotes.map((item) => `book_note:${item.id}`),
		`user_settings:${userId}`,
	];

	await db.transaction(
		"rw",
		[
			db.tasks,
			db.timeBlocks,
			db.calendarEvents,
			db.reminders,
			db.books,
			db.bookNotes,
			db.userSettings,
			db.localBackups,
			db.localSecurityProfiles,
			db.localIdentities,
			db.activeProfile,
			db.syncOperations,
			db.syncMetadata,
			db.syncConflicts,
			db.syncCursors,
			db.syncRuntime,
		],
		async () => {
			await Promise.all([
				db.tasks.bulkDelete(tasks.map((item) => item.id)),
				db.timeBlocks.bulkDelete(timeBlocks.map((item) => item.id)),
				db.calendarEvents.bulkDelete(calendarEvents.map((item) => item.id)),
				db.reminders.bulkDelete(reminders.map((item) => item.id)),
				db.books.bulkDelete(books.map((item) => item.id)),
				db.bookNotes.bulkDelete(bookNotes.map((item) => item.id)),
				db.userSettings.delete(userId),
				db.localBackups.bulkDelete(backups.map((item) => item.id)),
				db.localSecurityProfiles.delete(userId),
				db.localIdentities.delete(userId),
				db.activeProfile.delete("current"),
				db.syncOperations.bulkDelete(operations.map((item) => item.id)),
				db.syncConflicts.bulkDelete(conflicts.map((item) => item.id)),
				db.syncCursors.bulkDelete(cursors.map((item) => item.id)),
				db.syncRuntime.bulkDelete(runtime.map((item) => item.id)),
				db.syncMetadata.bulkDelete(entityKeys),
			]);
		},
	);

	try {
		await authClient.signOut();
	} catch {
		// El borrado local no depende de que el servidor esté disponible.
	}
}

export async function factoryResetApplication(): Promise<void> {
	try {
		await authClient.signOut();
	} catch {
		// El restablecimiento local continúa aunque la red falle.
	}

	if ("serviceWorker" in navigator) {
		const registrations = await navigator.serviceWorker.getRegistrations();

		await Promise.all(
			registrations.map((registration) => registration.unregister()),
		);
	}

	if ("caches" in window) {
		const names = await caches.keys();
		await Promise.all(names.map((name) => caches.delete(name)));
	}

	localStorage.clear();
	sessionStorage.clear();

	getLocalDatabase().close();
	await Dexie.delete("personal-productivity-os");
}
