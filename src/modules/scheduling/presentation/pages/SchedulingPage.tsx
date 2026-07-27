"use client";

import type { AppAccess } from "#/platform/auth/app-access.types";
import { SchedulingSyncBootstrap } from "#/platform/sync/SchedulingSyncBootstrap";
import { ResponsiveDialog } from "#/shared/components/responsive-dialog";
import { SchedulingSyncStatus } from "#/shared/components/SchedulingSyncStatus";
import { Button } from "#/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/shared/components/ui/card";
import { Separator } from "#/shared/components/ui/separator";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "#/shared/components/ui/tabs";
import {
	AddSquareIcon,
	ArrowLeft01Icon,
	ArrowRight01Icon,
	Calendar01Icon,
	CalendarAddIcon,
	CalendarCheckIcon,
	Time01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouteContext } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import type { CalendarEvent } from "../../domain/calendar-event";
import type { ScheduleEntry } from "../../domain/schedule-entry";
import type { TimeBlock } from "../../domain/time-block";
import { CalendarEventForm } from "../components/CalendarEventForm";
import { ScheduleWeek } from "../components/ScheduleWeek";
import { TimeBlockForm } from "../components/TimeBlockForm";
import { useScheduleRange } from "../hooks/use-schedule-range";
import { addDays, startOfLocalWeek, toRangeIso } from "../week-utils";

type EditorState =
	| {
			type: "time_block";
			item: TimeBlock | null;
	  }
	| {
			type: "calendar_event";
			item: CalendarEvent | null;
	  };

const motionVariantsWeek = {
	enter: (direction: number) => ({
		opacity: 0,
		x: direction > 0 ? 30 : -30,
	}),
	center: {
		opacity: 1,
		x: 0,
	},
	exit: (direction: number) => ({
		opacity: 0,
		x: direction > 0 ? -30 : 30,
	}),
};

const SCHEDULE_TABS = {
	WEEK: "week",
	BLOCKS: "blocks",
	EVENTS: "events",
} as const;

type ScheduleTab = (typeof SCHEDULE_TABS)[keyof typeof SCHEDULE_TABS];

export function SchedulingPage() {
	const { access } = useRouteContext({
		from: "/_app",
	});

	const identity = access.localIdentity;

	if (!identity) {
		return <p>El dispositivo no tiene una identidad local activa.</p>;
	}

	return (
		<SchedulingContent
			userId={identity.userId}
			deviceId={identity.deviceId}
			access={access}
		/>
	);
}

function SchedulingContent({
	userId,
	deviceId,
	access,
}: {
	userId: string;
	deviceId: string;
	access: AppAccess;
}) {
	const [weekStart, setWeekStart] = useState(() =>
		startOfLocalWeek(new Date()),
	);
	const [weekDirection, setWeekDirection] = useState(0);
	const [editor, setEditor] = useState<EditorState | null>(null);
	const [activeTab, setActiveTab] = useState<ScheduleTab>(SCHEDULE_TABS.WEEK);

	const rangeStart = useMemo(() => toRangeIso(weekStart), [weekStart]);
	const rangeEnd = useMemo(
		() => toRangeIso(addDays(weekStart, 7)),
		[weekStart],
	);

	const entries = useScheduleRange(userId, rangeStart, rangeEnd);
	const isLoading = entries === undefined;

	const context = {
		userId,
		deviceId,
	};

	const filteredEntries = useMemo(() => {
		const list = entries ?? [];
		if (activeTab === SCHEDULE_TABS.BLOCKS) {
			return list.filter((entry) => entry.entityType === "time_block");
		}
		if (activeTab === SCHEDULE_TABS.EVENTS) {
			return list.filter((entry) => entry.entityType === "calendar_event");
		}
		return list;
	}, [entries, activeTab]);

	const stats = useMemo(() => {
		const list = entries ?? [];
		return {
			blocks: list.filter((entry) => entry.entityType === "time_block").length,
			events: list.filter((entry) => entry.entityType === "calendar_event")
				.length,
			completed: list.filter(
				(entry) =>
					entry.entityType === "time_block" &&
					entry.item.status === "completed",
			).length,
		};
	}, [entries]);

	const goPrevWeek = () => {
		setWeekDirection(-1);
		setWeekStart(addDays(weekStart, -7));
	};

	const goNextWeek = () => {
		setWeekDirection(1);
		setWeekStart(addDays(weekStart, 7));
	};

	const goToday = () => {
		setWeekDirection(
			weekStart.getTime() < startOfLocalWeek(new Date()).getTime() ? 1 : -1,
		);
		setWeekStart(startOfLocalWeek(new Date()));
	};

	const handleEdit = (entry: ScheduleEntry) => {
		if (entry.entityType === "time_block") {
			setEditor({
				type: "time_block",
				item: entry.item,
			});
		} else {
			setEditor({
				type: "calendar_event",
				item: entry.item,
			});
		}
	};

	const closeEditor = () => setEditor(null);

	const dialogTitle =
		editor?.type === "time_block"
			? editor.item
				? "Editar bloque de tiempo"
				: "Nuevo bloque de tiempo"
			: editor?.item
				? "Editar evento"
				: "Nuevo evento";

	const dialogDescription =
		editor?.type === "time_block"
			? "Reserva tiempo para una tarea o actividad."
			: "Registra una reunión, cita o evento personal.";

	return (
		<div className="flex flex-col gap-6">
			<Card className="ring-1 ring-foreground/10 dark:ring-foreground/10">
				<CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<CardTitle className="text-base font-semibold tracking-tight">
							Sincronización de datos
						</CardTitle>
						<CardDescription>
							Estado offline, colas pendientes y resolución de conflictos.
						</CardDescription>
					</div>
					<div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
						<SchedulingSyncBootstrap access={access} />
						<SchedulingSyncStatus
							userId={
								access.localIdentity?.userId || access.remoteSession?.user.id
							}
						/>
					</div>
				</CardHeader>
			</Card>

			<Tabs
				value={activeTab}
				onValueChange={(value) => setActiveTab(value as ScheduleTab)}
			>
				<Card>
					<CardHeader className="flex flex-col gap-4">
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="flex items-center gap-3">
								<div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
									<HugeiconsIcon icon={CalendarCheckIcon} strokeWidth={2} />
								</div>
								<div>
									<CardTitle className="text-xl tracking-tight">
										Agenda
									</CardTitle>
									<CardDescription>
										Bloques de tiempo y eventos con funcionamiento offline.
									</CardDescription>
								</div>
							</div>

							<div className="flex flex-wrap items-center gap-2">
								<Button variant="outline" size="sm" onClick={goPrevWeek}>
									<HugeiconsIcon
										icon={ArrowLeft01Icon}
										strokeWidth={2}
										data-icon="inline-start"
									/>
									<span className="hidden sm:inline">Anterior</span>
								</Button>
								<Button variant="secondary" size="sm" onClick={goToday}>
									Hoy
								</Button>
								<Button variant="outline" size="sm" onClick={goNextWeek}>
									<span className="hidden sm:inline">Siguiente</span>
									<HugeiconsIcon
										icon={ArrowRight01Icon}
										strokeWidth={2}
										data-icon="inline-end"
									/>
								</Button>
							</div>
						</div>

						<Separator />

						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<TabsList>
								<TabsTrigger value={SCHEDULE_TABS.WEEK}>
									<HugeiconsIcon
										icon={Calendar01Icon}
										strokeWidth={2}
										data-icon="inline-start"
									/>
									Semana
								</TabsTrigger>
								<TabsTrigger value={SCHEDULE_TABS.BLOCKS}>
									<HugeiconsIcon
										icon={Time01Icon}
										strokeWidth={2}
										data-icon="inline-start"
									/>
									Bloques ({stats.blocks})
								</TabsTrigger>
								<TabsTrigger value={SCHEDULE_TABS.EVENTS}>
									<HugeiconsIcon
										icon={CalendarAddIcon}
										strokeWidth={2}
										data-icon="inline-start"
									/>
									Eventos ({stats.events})
								</TabsTrigger>
							</TabsList>

							<div className="flex flex-wrap items-center gap-2">
								<Button
									onClick={() => setEditor({ type: "time_block", item: null })}
								>
									<HugeiconsIcon
										icon={AddSquareIcon}
										strokeWidth={2}
										data-icon="inline-start"
									/>
									Nuevo bloque
								</Button>
								<Button
									variant="secondary"
									onClick={() =>
										setEditor({ type: "calendar_event", item: null })
									}
								>
									<HugeiconsIcon
										icon={CalendarAddIcon}
										strokeWidth={2}
										data-icon="inline-start"
									/>
									Nuevo evento
								</Button>
							</div>
						</div>
					</CardHeader>
					<Separator />
					<CardContent className="pt-6">
						<header className="mb-4 flex flex-wrap items-end justify-between gap-2">
							<div>
								<h2 className="text-lg font-semibold tracking-tight">
									Semana del{" "}
									{new Intl.DateTimeFormat("es-PE", {
										dateStyle: "long",
									}).format(weekStart)}
								</h2>
								<p className="text-sm text-muted-foreground">
									{activeTab === SCHEDULE_TABS.WEEK
										? stats.blocks + stats.events
										: filteredEntries.length}{" "}
									{filteredEntries.length === 1 ? "elemento" : "elementos"}
									{activeTab !== SCHEDULE_TABS.WEEK &&
										stats.completed > 0 &&
										` · ${stats.completed} completados`}
								</p>
							</div>
						</header>

						<TabsContent value={SCHEDULE_TABS.WEEK} className="mt-0">
							<AnimatePresence
								mode="wait"
								custom={weekDirection}
								initial={false}
							>
								<motion.div
									key={`${SCHEDULE_TABS.WEEK}-${weekStart.toISOString()}`}
									custom={weekDirection}
									variants={motionVariantsWeek}
									initial="enter"
									animate="center"
									exit="exit"
									transition={{ duration: 0.25, ease: "easeOut" }}
								>
									<ScheduleWeek
										weekStart={weekStart}
										entries={entries ?? []}
										context={context}
										onEdit={handleEdit}
										isLoading={isLoading}
									/>
								</motion.div>
							</AnimatePresence>
						</TabsContent>

						<TabsContent value={SCHEDULE_TABS.BLOCKS} className="mt-0">
							<AnimatePresence mode="wait" initial={false}>
								<motion.div
									key={`${SCHEDULE_TABS.BLOCKS}-${weekStart.toISOString()}`}
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -6 }}
									transition={{ duration: 0.2, ease: "easeOut" }}
								>
									<ScheduleWeek
										weekStart={weekStart}
										entries={filteredEntries}
										context={context}
										onEdit={handleEdit}
										isLoading={isLoading}
									/>
								</motion.div>
							</AnimatePresence>
						</TabsContent>

						<TabsContent value={SCHEDULE_TABS.EVENTS} className="mt-0">
							<AnimatePresence mode="wait" initial={false}>
								<motion.div
									key={`${SCHEDULE_TABS.EVENTS}-${weekStart.toISOString()}`}
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -6 }}
									transition={{ duration: 0.2, ease: "easeOut" }}
								>
									<ScheduleWeek
										weekStart={weekStart}
										entries={filteredEntries}
										context={context}
										onEdit={handleEdit}
										isLoading={isLoading}
									/>
								</motion.div>
							</AnimatePresence>
						</TabsContent>
					</CardContent>
					<CardFooter className="flex-col items-start gap-1 border-t bg-muted/20 text-xs text-muted-foreground">
						<p>
							Consejo: arranca la semana planificando tus bloques de enfoque y
							reserva tiempo para pausas cortas.
						</p>
					</CardFooter>
				</Card>
			</Tabs>

			<ResponsiveDialog
				open={editor !== null}
				onOpenChange={(open) => {
					if (!open) closeEditor();
				}}
				title={dialogTitle}
				description={dialogDescription}
			>
				<div className="px-0 sm:px-0">
					{editor?.type === "time_block" ? (
						<TimeBlockForm
							key={editor.item?.id ?? "new-block"}
							context={context}
							block={editor.item}
							initialDate={weekStart}
							onCompleted={closeEditor}
						/>
					) : editor?.type === "calendar_event" ? (
						<CalendarEventForm
							key={editor.item?.id ?? "new-event"}
							context={context}
							event={editor.item}
							initialDate={weekStart}
							onCompleted={closeEditor}
						/>
					) : null}
				</div>
			</ResponsiveDialog>
		</div>
	);
}
