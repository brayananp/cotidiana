import { useSyncExternalStore } from "react";
import {
	getAppLockServerSnapshot,
	getAppLockSnapshot,
	subscribeAppLock,
} from "./local-lock-state-client";

export function useAppLock() {
	return useSyncExternalStore(
		subscribeAppLock,
		getAppLockSnapshot,
		getAppLockServerSnapshot,
	);
}
