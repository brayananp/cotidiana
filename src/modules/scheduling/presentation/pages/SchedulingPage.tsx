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
	CardHeader,
	CardTitle,
} from "#/shared/components/ui/card";
import {
	AddSquareIcon,
	ArrowLeft01Icon,
	ArrowRight01Icon,
	CalendarAddIcon,
	CalendarCheckIcon,
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

	const rangeStart = useMemo(() => toRangeIso(weekStart), [weekStart]);
	const rangeEnd = useMemo(
		() => toRangeIso(addDays(weekStart, 7)),
		[weekStart],
	);

	const entries = useScheduleRange(userId, rangeStart, rangeEnd);

	const context = {
		userId,
		deviceId,
	};

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
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">sincronizacion de datos</h2>
				<SchedulingSyncBootstrap access={access} />
				<SchedulingSyncStatus
					userId={access.localIdentity?.userId || access.remoteSession?.user.id}
				/>
			</div>
			<Card>
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
								<HugeiconsIcon icon={CalendarCheckIcon} strokeWidth={2} />
							</div>
							<div>
								<CardTitle className="text-xl">Agenda</CardTitle>
								<CardDescription>
									Bloques de tiempo y eventos con funcionamiento offline.
								</CardDescription>
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-2">
							<Button variant="outline" size="sm" onClick={goPrevWeek}>
								<HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
								<span className="hidden sm:inline">Anterior</span>
							</Button>
							<Button variant="secondary" size="sm" onClick={goToday}>
								Hoy
							</Button>
							<Button variant="outline" size="sm" onClick={goNextWeek}>
								<span className="hidden sm:inline">Siguiente</span>
								<HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							onClick={() => setEditor({ type: "time_block", item: null })}
						>
							<HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} />
							Nuevo bloque
						</Button>
						<Button
							variant="secondary"
							onClick={() => setEditor({ type: "calendar_event", item: null })}
						>
							<HugeiconsIcon icon={CalendarAddIcon} strokeWidth={2} />
							Nuevo evento
						</Button>
					</div>
				</CardContent>
			</Card>

			<header className="flex items-baseline justify-between">
				<h2 className="text-lg font-semibold">
					Semana del{" "}
					{new Intl.DateTimeFormat("es-PE", {
						dateStyle: "long",
					}).format(weekStart)}
				</h2>
				<p className="text-sm text-muted-foreground">
					{entries.length} {entries.length === 1 ? "elemento" : "elementos"}
				</p>
			</header>

			<AnimatePresence mode="wait" custom={weekDirection} initial={false}>
				<motion.div
					key={weekStart.toISOString()}
					custom={weekDirection}
					variants={motionVariantsWeek}
					initial="enter"
					animate="center"
					exit="exit"
					transition={{ duration: 0.25, ease: "easeOut" }}
				>
					<ScheduleWeek
						weekStart={weekStart}
						entries={entries}
						context={context}
						onEdit={handleEdit}
					/>
				</motion.div>
			</AnimatePresence>

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
