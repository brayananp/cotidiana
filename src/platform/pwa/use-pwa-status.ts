import { useSyncExternalStore } from "react";
import {
	getPwaServerSnapshot,
	getPwaSnapshot,
	subscribePwaState,
} from "./pwa-state-client";

export function usePwaStatus() {
	return useSyncExternalStore(
		subscribePwaState,
		getPwaSnapshot,
		getPwaServerSnapshot,
	);
}
