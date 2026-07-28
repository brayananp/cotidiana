interface ImportMetaEnv {
	readonly VITE_PWA_DEV?: "true" | "false";
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
