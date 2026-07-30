import {
	Activity01Icon,
	AlignLeftIcon,
	CheckmarkCircle02Icon,
	Flag01Icon,
	HappyIcon,
	StopIcon,
	Sun01Icon,
	Target01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/shared/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupTextarea,
} from "@/shared/components/ui/input-group";
import { Separator } from "@/shared/components/ui/separator";
import { Spinner } from "@/shared/components/ui/spinner";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@/shared/components/ui/toggle-group";
import type { DashboardExecutionContext } from "../../application/dashboard-context";
import type { DailyReview } from "../../domain/daily-review";
import { dashboardDependencies } from "../../infrastructure/dashboard.dependencies";
import type { DailyReviewFormInput } from "../../schemas/daily-review-form.schema";

const SCORES = [1, 2, 3, 4, 5] as const;

export function DailyReviewForm({
	reviewDate,
	review,
	context,
}: {
	reviewDate: string;
	review: DailyReview | null;
	context: DashboardExecutionContext;
}) {
	const [values, setValues] = useState<DailyReviewFormInput>(() =>
		defaults(review),
	);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => setValues(defaults(review)), [review]);

	return (
		<Card className="p-0 overflow-hidden">
			{/* Header */}
			<CardHeader className="px-4 pt-4 pb-3">
				<CardTitle className="flex items-center gap-2 text-sm font-semibold">
					<div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
						<HugeiconsIcon icon={Flag01Icon} size={13} />
					</div>
					<span>Revisión diaria</span>
				</CardTitle>
				<CardDescription className="text-[11px] leading-tight">
					Reflexiona sobre tu día y planifica mañana.
				</CardDescription>
			</CardHeader>

			<Separator />

			<CardContent className="px-4 py-3">
				<form
					className="flex flex-col gap-4"
					onSubmit={async (event) => {
						event.preventDefault();
						setBusy(true);
						setMessage(null);
						setError(null);
						try {
							await dashboardDependencies.upsertReview(
								reviewDate,
								values,
								context,
							);
							setMessage(
								values.completed
									? "Revisión completada con éxito."
									: "Borrador guardado.",
							);
						} catch (caught) {
							setError(
								caught instanceof Error
									? caught.message
									: "No fue posible guardar la revisión.",
							);
						} finally {
							setBusy(false);
						}
					}}
				>
					{/* Score Rows — Vertically stacked to prevent horizontal collision */}
					<div className="flex flex-col gap-2">
						<ScoreRow
							label="Ánimo"
							icon={HappyIcon}
							value={values.mood}
							onChange={(mood) => setValues((v) => ({ ...v, mood }))}
						/>
						<ScoreRow
							label="Energía"
							icon={Sun01Icon}
							value={values.energy}
							onChange={(energy) => setValues((v) => ({ ...v, energy }))}
						/>
						<ScoreRow
							label="Productividad"
							icon={Activity01Icon}
							value={values.productivity}
							onChange={(productivity) =>
								setValues((v) => ({ ...v, productivity }))
							}
						/>
					</div>

					<Separator />

					{/* Wins & Blockers */}
					<div className="grid gap-3 sm:grid-cols-2">
						<Field>
							<FieldLabel className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
								<HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} />
								Logros
							</FieldLabel>
							<InputGroup className="h-auto">
								<InputGroupTextarea
									rows={2}
									value={values.wins}
									onChange={(e) =>
										setValues((v) => ({ ...v, wins: e.target.value }))
									}
									placeholder="¿Qué salió bien hoy?"
									className="text-xs min-h-[52px]"
								/>
							</InputGroup>
						</Field>

						<Field>
							<FieldLabel className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
								<HugeiconsIcon icon={StopIcon} size={12} />
								Bloqueos
							</FieldLabel>
							<InputGroup className="h-auto">
								<InputGroupTextarea
									rows={2}
									value={values.blockers}
									onChange={(e) =>
										setValues((v) => ({ ...v, blockers: e.target.value }))
									}
									placeholder="¿Qué te frenó?"
									className="text-xs min-h-[52px]"
								/>
							</InputGroup>
						</Field>
					</div>

					{/* Notes */}
					<Field>
						<FieldLabel className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
							<HugeiconsIcon icon={AlignLeftIcon} size={12} />
							Notas
						</FieldLabel>
						<InputGroup className="h-auto">
							<InputGroupTextarea
								rows={2}
								value={values.notes}
								onChange={(e) =>
									setValues((v) => ({ ...v, notes: e.target.value }))
								}
								placeholder="Reflexión libre del día..."
								className="text-xs min-h-[44px]"
							/>
						</InputGroup>
					</Field>

					<Separator />

					{/* Tomorrow priorities */}
					<FieldGroup className="flex flex-col gap-2">
						<FieldLabel className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
							<HugeiconsIcon icon={Target01Icon} size={12} />
							Prioridades para mañana
						</FieldLabel>
						{([0, 1, 2] as const).map((index) => (
							<InputGroup key={index}>
								<InputGroupAddon align="inline-start">
									<span className="text-[10px] font-bold text-muted-foreground/60 tabular-nums">
										{index + 1}
									</span>
								</InputGroupAddon>
								<InputGroupInput
									value={values.tomorrowPriorities[index] ?? ""}
									onChange={(event) => {
										const priorities = [...values.tomorrowPriorities];
										priorities[index] = event.target.value;
										setValues((current) => ({
											...current,
											tomorrowPriorities: priorities,
										}));
									}}
									placeholder={`Prioridad ${index + 1}`}
									className="h-8 text-xs"
								/>
							</InputGroup>
						))}
					</FieldGroup>

					{/* Footer */}
					<div className="flex items-center justify-between gap-3 pt-0.5">
						<label
							htmlFor="review-completed"
							className="flex cursor-pointer items-center gap-2"
						>
							<Checkbox
								id="review-completed"
								checked={values.completed}
								onCheckedChange={(checked) =>
									setValues((current) => ({
										...current,
										completed: Boolean(checked),
									}))
								}
							/>
							<span className="text-xs font-medium text-foreground">
								Marcar como completada
							</span>
						</label>

						<Button
							type="submit"
							disabled={busy}
							size="sm"
							className="h-8 gap-1.5 text-xs font-semibold shrink-0"
						>
							{busy && <Spinner className="size-3.5" />}
							<span>
								{busy
									? "Guardando…"
									: values.completed
										? "Completar"
										: "Guardar borrador"}
							</span>
						</Button>
					</div>

					{message && (
						<Alert
							variant="default"
							className="border-emerald-500/20 bg-emerald-500/10 py-2"
						>
							<AlertDescription className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
								<HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} />
								<span>{message}</span>
							</AlertDescription>
						</Alert>
					)}

					{error && (
						<Alert variant="destructive" className="py-2">
							<AlertDescription className="text-xs">{error}</AlertDescription>
						</Alert>
					)}
				</form>
			</CardContent>
		</Card>
	);
}

function defaults(review: DailyReview | null): DailyReviewFormInput {
	return {
		mood: review?.mood ?? 3,
		energy: review?.energy ?? 3,
		productivity: review?.productivity ?? 3,
		wins: review?.wins ?? "",
		blockers: review?.blockers ?? "",
		notes: review?.notes ?? "",
		tomorrowPriorities: review?.tomorrowPriorities ?? ["", "", ""],
		completed: Boolean(review?.completedAt),
	};
}

/** Fila horizontal para cada métrica de score (evita desbordamientos en contenedores angostos) */
function ScoreRow({
	label,
	icon,
	value,
	onChange,
}: {
	label: string;
	icon: HugeiconsIconProps["icon"];
	value: 1 | 2 | 3 | 4 | 5;
	onChange: (value: 1 | 2 | 3 | 4 | 5) => void;
}) {
	return (
		<div className="flex items-center justify-between gap-2 py-0.5">
			<div className="flex items-center gap-1.5 min-w-0">
				<HugeiconsIcon
					icon={icon}
					size={14}
					className="text-muted-foreground shrink-0"
				/>
				<span className="text-xs font-medium text-foreground truncate">
					{label}
				</span>
			</div>
			<ToggleGroup
				value={[String(value)]}
				onValueChange={(val: string[]) => {
					const selected = val[val.length - 1];
					if (selected) onChange(Number(selected) as 1 | 2 | 3 | 4 | 5);
				}}
				className="gap-1 shrink-0"
			>
				{SCORES.map((score) => (
					<ToggleGroupItem
						key={score}
						value={String(score)}
						size="sm"
						className="size-7 rounded-lg text-xs font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
					>
						{score}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	);
}
