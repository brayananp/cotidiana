import {
	Calendar01Icon,
	Cancel01Icon,
	Clock01Icon,
	Sun01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	addDays,
	format,
	isToday,
	isTomorrow,
	isValid,
	nextMonday,
	parseISO,
	setHours,
	setMinutes,
} from "date-fns";
import { es } from "date-fns/locale";
import type * as React from "react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Separator } from "@/shared/components/ui/separator";

export type DateTimePickerProps = {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	onBlur?: () => void;
	placeholder?: string;
	className?: string;
};

export function DateTimePicker({
	id,
	value,
	onChange,
	onBlur,
	placeholder = "Seleccionar fecha y hora…",
	className = "",
}: DateTimePickerProps) {
	const [open, setOpen] = useState(false);

	const formattedDisplay = formatDisplayDate(value);

	const handleSelectPreset = (presetValue: string) => {
		onChange(presetValue);
		setOpen(false);
	};

	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		onChange("");
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<button
						id={id}
						type="button"
						onBlur={onBlur}
						className={`group relative flex h-9 w-full min-w-0 cursor-pointer items-center justify-between rounded-2xl border border-transparent bg-input/50 px-3 text-xs transition-colors hover:border-primary/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 outline-none ${className}`}
					>
						<div className="flex items-center gap-2 min-w-0 flex-1">
							<HugeiconsIcon
								icon={Calendar01Icon}
								size={14}
								className="text-muted-foreground shrink-0"
							/>
							<span
								className={`truncate leading-none ${
									formattedDisplay
										? "font-medium text-foreground"
										: "text-muted-foreground"
								}`}
							>
								{formattedDisplay || placeholder}
							</span>
						</div>

						{value ? (
							<Button
								variant="ghost"
								size="icon"
								onClick={handleClear}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleClear(e as unknown as React.MouseEvent);
									}
								}}
								className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
								title="Limpiar fecha"
							>
								<HugeiconsIcon icon={Cancel01Icon} size={12} />
							</Button>
						) : (
							<HugeiconsIcon
								icon={Clock01Icon}
								size={13}
								className="text-muted-foreground/60 shrink-0"
							/>
						)}
					</button>
				}
			/>

			<PopoverContent align="start" className="w-72 p-3 gap-3">
				<div className="flex flex-col gap-1">
					<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
						Acceso rápido
					</span>

					{/* Presets Grid using date-fns */}
					<div className="grid grid-cols-2 gap-1.5 pt-1">
						<Button
							type="button"
							variant="outline"
							size="xs"
							onClick={() => handleSelectPreset(getToday18())}
							className="justify-start gap-1.5 h-8 text-xs font-normal"
						>
							<HugeiconsIcon
								icon={Sun01Icon}
								size={13}
								className="text-amber-500"
							/>
							<span>Hoy (18:00)</span>
						</Button>

						<Button
							type="button"
							variant="outline"
							size="xs"
							onClick={() => handleSelectPreset(getTomorrow09())}
							className="justify-start gap-1.5 h-8 text-xs font-normal"
						>
							<HugeiconsIcon
								icon={Calendar01Icon}
								size={13}
								className="text-blue-500"
							/>
							<span>Mañana (09:00)</span>
						</Button>

						<Button
							type="button"
							variant="outline"
							size="xs"
							onClick={() => handleSelectPreset(getIn3Days09())}
							className="justify-start gap-1.5 h-8 text-xs font-normal"
						>
							<HugeiconsIcon
								icon={Clock01Icon}
								size={13}
								className="text-emerald-500"
							/>
							<span>En 3 días</span>
						</Button>

						<Button
							type="button"
							variant="outline"
							size="xs"
							onClick={() => handleSelectPreset(getNextMonday09())}
							className="justify-start gap-1.5 h-8 text-xs font-normal"
						>
							<HugeiconsIcon
								icon={Calendar01Icon}
								size={13}
								className="text-purple-500"
							/>
							<span>Próx. lunes</span>
						</Button>
					</div>
				</div>

				<Separator />

				{/* Custom Exact Date-Time Input */}
				<div className="flex flex-col gap-1.5">
					<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
						Fecha y hora exacta
					</span>
					<Input
						type="datetime-local"
						value={value}
						onChange={(e) => onChange(e.target.value)}
						className="h-8 text-xs"
					/>
				</div>

				{value && (
					<Button
						type="button"
						variant="ghost"
						size="xs"
						onClick={handleClear}
						className="w-full justify-center text-xs text-destructive hover:text-destructive"
					>
						Limpiar fecha
					</Button>
				)}
			</PopoverContent>
		</Popover>
	);
}

// ── Helpers using date-fns ────────────────────────────────────────────────

function toLocalIsoString(date: Date): string {
	return format(date, "yyyy-MM-dd'T'HH:mm");
}

function getToday18(): string {
	const now = new Date();
	const today18 = setMinutes(setHours(now, 18), 0);
	return toLocalIsoString(today18);
}

function getTomorrow09(): string {
	const tomorrow = addDays(new Date(), 1);
	const tomorrow09 = setMinutes(setHours(tomorrow, 9), 0);
	return toLocalIsoString(tomorrow09);
}

function getIn3Days09(): string {
	const in3Days = addDays(new Date(), 3);
	const in3Days09 = setMinutes(setHours(in3Days, 9), 0);
	return toLocalIsoString(in3Days09);
}

function getNextMonday09(): string {
	const nextMon = nextMonday(new Date());
	const nextMon09 = setMinutes(setHours(nextMon, 9), 0);
	return toLocalIsoString(nextMon09);
}

function formatDisplayDate(value: string): string {
	if (!value) return "";
	const date = parseISO(value);
	if (!isValid(date)) return "";

	const timeStr = format(date, "h:mm a", { locale: es });

	if (isToday(date)) return `Hoy, ${timeStr}`;
	if (isTomorrow(date)) return `Mañana, ${timeStr}`;

	return format(date, "EEE d 'de' MMM, h:mm a", { locale: es });
}
