import { Button } from "#/shared/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#/shared/components/ui/empty";
import { Input } from "#/shared/components/ui/input";
import { Separator } from "#/shared/components/ui/separator";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "#/shared/components/ui/tabs";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouteContext } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import type { Reminder, ReminderStatus } from "../../domain/reminder";
import { NotificationPermissionCard } from "../components/NotificationPermissionCard";
import { ReminderForm } from "../components/ReminderForm";
import { ReminderItem } from "../components/ReminderItem";
import { useReminders } from "../hooks/use-reminders";

type ReminderFilter = "active" | "triggered" | "history" | "all";

const FILTER_TABS: Array<{
	value: ReminderFilter;
	label: string;
	icon: typeof Calendar01Icon;
}> = [
	{ value: "active", label: "Activos", icon: Calendar01Icon },
	{ value: "triggered", label: "Activados", icon: Clock01Icon },
	{ value: "history", label: "Historial", icon: TaskDone01Icon },
	{ value: "all", label: "Todos", icon: UnfoldMoreIcon },
];

export function RemindersPage() {
	const { access } = useRouteContext({
		from: "/_app",
	});

	const identity = access.localIdentity;

	if (!identity) {
		return (
			<section className="space-y-6">
				<header>
					<h1 className="text-2xl font-semibold">Recordatorios</h1>
					<p className="text-sm text-muted-foreground">
						Recordatorios offline, recurrentes y sincronizados con Turso.
					</p>
				</header>
				<div className="rounded-xl border border-dashed p-8 text-center">
					<h2 className="font-medium">Identidad local no disponible</h2>
					<p className="text-sm text-muted-foreground">
						El dispositivo no tiene una identidad local activa.
					</p>
				</div>
			</section>
		);
	}

	return (
		<RemindersContent userId={identity.userId} deviceId={identity.deviceId} />
	);
}

function RemindersContent({
	userId,
	deviceId,
}: {
	userId: string;
	deviceId: string;
}) {
	const [filter, setFilter] = useState<ReminderFilter>("active");
	const [search, setSearch] = useState("");
	const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

	const statuses = useMemo(() => statusesForFilter(filter), [filter]);
	const reminders = useReminders(userId, statuses, search);

	const context = {
		userId,
		deviceId,
	};

	return (
		<motion.section
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35, ease: "easeOut" }}
			className="flex flex-col gap-6"
		>
			<header className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold tracking-tight">Recordatorios</h1>
				<p className="text-sm text-muted-foreground">
					Recordatorios offline, recurrentes y sincronizados con Turso.
				</p>
			</header>

			<NotificationPermissionCard />

			<ReminderForm
				key={editingReminder?.id ?? "new-reminder"}
				context={context}
				reminder={editingReminder}
				onCompleted={() => setEditingReminder(null)}
			/>

			<Separator />

			<Tabs
				value={filter}
				onValueChange={(value) => setFilter(value as ReminderFilter)}
			>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<TabsList variant="default">
						{FILTER_TABS.map((tab) => (
							<TabsTrigger key={tab.value} value={tab.value}>
								<HugeiconsIcon
									icon={tab.icon}
									strokeWidth={2}
									data-icon="inline-start"
								/>
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>

					<div className="relative w-full sm:w-80">
						<HugeiconsIcon
							icon={Edit03Icon}
							strokeWidth={2}
							className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							type="search"
							placeholder="Buscar recordatorios"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							className="pl-9"
						/>
					</div>
				</div>

				{FILTER_TABS.map((tab) => (
					<TabsContent key={tab.value} value={tab.value} className="pt-4">
						<RemindersList
							reminders={reminders}
							context={context}
							onEdit={setEditingReminder}
							filterLabel={tab.label}
							search={search}
						/>
					</TabsContent>
				))}
			</Tabs>
		</motion.section>
	);
}

function RemindersList({
	reminders,
	context,
	onEdit,
	filterLabel,
	search,
}: {
	reminders: Reminder[];
	context: { userId: string; deviceId: string };
	onEdit: (reminder: Reminder) => void;
	filterLabel: string;
	search: string;
}) {
	return (
		<AnimatePresence mode="popLayout">
			{reminders.length === 0 ? (
				<motion.div
					key={`empty-${filterLabel}-${search}`}
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -6 }}
					transition={{ duration: 0.25 }}
				>
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} />
							</EmptyMedia>
							<EmptyContent>
								<EmptyTitle>
									Sin recordatorios en {filterLabel.toLowerCase()}
								</EmptyTitle>
								<EmptyDescription>
									{search
										? "Prueba con otra búsqueda o cambia el filtro."
										: "Crea un recordatorio nuevo para comenzar."}
								</EmptyDescription>
								{!search && (
									<div className="pt-2">
										<Button variant="outline" size="sm" asChild>
											<a href="#form">Crear recordatorio</a>
										</Button>
									</div>
								)}
							</EmptyContent>
						</EmptyHeader>
					</Empty>
				</motion.div>
			) : (
				<motion.div
					layout
					className="flex flex-col gap-3"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
				>
					{reminders.map((reminder, index) => (
						<ReminderItem
							key={reminder.id}
							index={index}
							reminder={reminder}
							context={context}
							onEdit={onEdit}
						/>
					))}
				</motion.div>
			)}
		</AnimatePresence>
	);
}

function statusesForFilter(filter: ReminderFilter): ReminderStatus[] {
	if (filter === "active") {
		return ["scheduled", "snoozed"];
	}

	if (filter === "triggered") {
		return ["triggered"];
	}

	if (filter === "history") {
		return ["dismissed", "cancelled"];
	}

	return ["scheduled", "snoozed", "triggered", "dismissed", "cancelled"];
}
