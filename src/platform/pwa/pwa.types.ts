export type BeforeInstallPromptChoice = {
	outcome: "accepted" | "dismissed";
	platform: string;
};

export interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];

	readonly userChoice: Promise<BeforeInstallPromptChoice>;

	prompt(): Promise<void>;
}

declare global {
	interface WindowEventMap {
		beforeinstallprompt: BeforeInstallPromptEvent;
	}

	interface Navigator {
		standalone?: boolean;
	}
}
