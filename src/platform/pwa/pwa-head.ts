export const pwaHead = {
	meta: [
		{
			charSet: "utf-8",
		},

		{
			name: "viewport",
			content: "width=device-width, initial-scale=1, viewport-fit=cover",
		},

		{
			name: "theme-color",
			content: "#0f172a",
		},

		{
			name: "application-name",
			content: "Personal Productivity OS",
		},

		{
			name: "apple-mobile-web-app-capable",
			content: "yes",
		},

		{
			name: "apple-mobile-web-app-status-bar-style",
			content: "default",
		},

		{
			name: "apple-mobile-web-app-title",
			content: "Productivity OS",
		},

		{
			name: "mobile-web-app-capable",
			content: "yes",
		},
	],

	links: [
		{
			rel: "manifest",
			href: "/manifest.webmanifest",
		},

		{
			rel: "icon",
			type: "image/svg+xml",
			href: "/pwa-icon.svg",
		},

		{
			rel: "icon",
			type: "image/png",
			sizes: "64x64",
			href: "/pwa-64x64.png",
		},

		{
			rel: "apple-touch-icon",
			sizes: "180x180",
			href: "/apple-touch-icon.png",
		},
	],
} as const;
