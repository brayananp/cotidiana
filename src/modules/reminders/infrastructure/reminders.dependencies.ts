import { cancelReminderCommand } from "../application/commands/cancel-reminder";
import { createReminderCommand } from "../application/commands/create-reminder";
import { deleteReminderCommand } from "../application/commands/delete-reminder";
import { dismissReminderCommand } from "../application/commands/dismiss-reminder";
import { snoozeReminderCommand } from "../application/commands/snooze-reminder";
import { updateReminderCommand } from "../application/commands/update-reminder";
import { listRemindersQuery } from "../application/queries/list-reminders";
import { DexieReminderRepository } from "./local/dexie-reminder.repository";
import { DexieReminderWriteStore } from "./local/dexie-reminder-write-store";

const repository = new DexieReminderRepository();

const writeStore = new DexieReminderWriteStore();

export const remindersDependencies = {
	repository,
	writeStore,

	createReminder: createReminderCommand(writeStore),

	updateReminder: updateReminderCommand(repository, writeStore),

	snoozeReminder: snoozeReminderCommand(repository, writeStore),

	dismissReminder: dismissReminderCommand(repository, writeStore),

	cancelReminder: cancelReminderCommand(repository, writeStore),

	deleteReminder: deleteReminderCommand(repository, writeStore),

	listReminders: listRemindersQuery(repository),
};
