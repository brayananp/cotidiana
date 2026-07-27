import {
	getNotificationPermissionState,
	type NotificationPermissionState,
	requestNotificationPermission,
} from "#/platform/notifications/notification-permission-client";
import { Button } from "#/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/shared/components/ui/card";
import { cn } from "#/shared/lib/utils";
import {
	BellIcon,
	CheckmarkCircle02Icon,
	Clock01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import { useState } from "react";

export function NotificationPermissionCard() {
	const [permission, setPermission] = useState<NotificationPermissionState>(
		() => getNotificationPermissionState(),
	);

	if (permission === "granted") {
		return (
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
			>
				<Card className="bg-success/5 border-success/20">
					<CardHeader className="flex flex-row items-center gap-3">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
							<HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
						</div>
						<div className="flex flex-col gap-1">
							<CardTitle className="text-sm text-success">
								Notificaciones habilitadas
							</CardTitle>
							<CardDescription className="text-sm">
								Los recordatorios aparecerán como notificaciones del sistema.
							</CardDescription>
						</div>
					</CardHeader>
				</Card>
			</motion.div>
		);
	}

	if (permission === "unsupported") {
		return (
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3 }}
			>
				<Card className="bg-muted/40">
					<CardHeader className="flex flex-row items-center gap-3">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
							<HugeiconsIcon icon={Clock01Icon} strokeWidth={2} />
						</div>
						<div className="flex flex-col gap-1">
							<CardTitle className="text-sm">Navegador sin soporte</CardTitle>
							<CardDescription className="text-sm">
								Este navegador no admite notificaciones desde la página. Los
								recordatorios activados seguirán apareciendo dentro de la
								aplicación.
							</CardDescription>
						</div>
					</CardHeader>
				</Card>
			</motion.div>
		);
	}

	const isDenied = permission === "denied";

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
		>
			<Card
				className={cn(
					isDenied
						? "bg-destructive/5 border-destructive/20"
						: "bg-warning/5 border-warning/20",
				)}
			>
				<CardHeader className="flex flex-row items-start gap-3">
					<div
						className={cn(
							"flex size-9 shrink-0 items-center justify-center rounded-xl",
							isDenied
								? "bg-destructive/15 text-destructive"
								: "bg-warning/15 text-warning",
						)}
					>
						<HugeiconsIcon
							icon={isDenied ? Clock01Icon : Clock01Icon}
							strokeWidth={2}
						/>
					</div>
					<div className="flex flex-1 flex-col gap-1">
						<CardTitle
							className={cn(
								"text-sm",
								isDenied ? "text-destructive" : "text-foreground",
							)}
						>
							{isDenied
								? "Permiso de notificaciones bloqueado"
								: "Activa las notificaciones del sistema"}
						</CardTitle>
						<CardDescription className="text-sm">
							{isDenied
								? "Para recibir recordatorios fuera de la aplicación, permite las notificaciones desde la configuración del navegador."
								: "Permite que el navegador muestre recordatorios incluso cuando la pestaña no está enfocada."}
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent className="flex justify-end">
					<Button
						variant={isDenied ? "outline" : "default"}
						size="sm"
						disabled={isDenied}
						onClick={async () => {
							const result = await requestNotificationPermission();
							setPermission(result);
						}}
					>
						<HugeiconsIcon
							icon={BellIcon}
							strokeWidth={2}
							data-icon="inline-start"
						/>
						{isDenied ? "Revisar permisos" : "Activar notificaciones"}
					</Button>
				</CardContent>
			</Card>
		</motion.div>
	);
}
