import { CheckmarkCircle02Icon, StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import { Input } from "@/shared/components/ui/input";
import { Separator } from "@/shared/components/ui/separator";
import { Spinner } from "@/shared/components/ui/spinner";
import { Textarea } from "@/shared/components/ui/textarea";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@/shared/components/ui/toggle-group";
import type { DashboardExecutionContext } from "../../application/dashboard-context";
import type { DailyReview } from "../../domain/daily-review";
import { dashboardDependencies } from "../../infrastructure/dashboard.dependencies";
import type { DailyReviewFormInput } from "../../schemas/daily-review-form.schema";

const SCORES = [1, 2, 3, 4, 5] as const;
const SCORE_LABELS: Record<number, string> = {
	1: "😞",
	2: "😕",
	3: "😐",
	4: "😊",
	5: "🤩",
};

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
					<div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
						<HugeiconsIcon icon={StarIcon} size={13} />
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
					className="flex flex-col gap-3"
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
					{/* Scores */}
					<div className="grid grid-cols-3 gap-2">
						<ScoreToggleField
							label="Ánimo"
							value={values.mood}
							onChange={(mood) => setValues((v) => ({ ...v, mood }))}
						/>
						<ScoreToggleField
							label="Energía"
							value={values.energy}
							onChange={(energy) => setValues((v) => ({ ...v, energy }))}
						/>
						<ScoreToggleField
							label="Productividad"
							value={values.productivity}
							onChange={(productivity) =>
								setValues((v) => ({ ...v, productivity }))
							}
						/>
					</div>

					<Separator className="my-0.5" />

					{/* Wins & Blockers */}
					<div className="grid gap-2 sm:grid-cols-2">
						<Field>
							<FieldLabel className="text-[11px] font-semibold text-muted-foreground">
								✅ Logros
							</FieldLabel>
							<Textarea
								rows={2}
								value={values.wins}
								onChange={(e) =>
									setValues((v) => ({ ...v, wins: e.target.value }))
								}
								placeholder="¿Qué salió bien hoy?"
								className="text-xs field-sizing-content resize-none min-h-[56px]"
							/>
						</Field>

						<Field>
							<FieldLabel className="text-[11px] font-semibold text-muted-foreground">
								🚧 Bloqueos
							</FieldLabel>
							<Textarea
								rows={2}
								value={values.blockers}
								onChange={(e) =>
									setValues((v) => ({ ...v, blockers: e.target.value }))
								}
								placeholder="¿Qué te frenó?"
								className="text-xs field-sizing-content resize-none min-h-[56px]"
							/>
						</Field>
					</div>

					{/* Notes — collapsible feel, single row by default */}
					<Field>
						<FieldLabel className="text-[11px] font-semibold text-muted-foreground">
							📝 Notas
						</FieldLabel>
						<Textarea
							rows={2}
							value={values.notes}
							onChange={(e) =>
								setValues((v) => ({ ...v, notes: e.target.value }))
							}
							placeholder="Reflexión libre del día..."
							className="text-xs field-sizing-content resize-none min-h-[44px]"
						/>
					</Field>

					<Separator className="my-0.5" />

					{/* Tomorrow priorities */}
					<FieldGroup className="flex flex-col gap-1.5">
						<FieldLabel className="text-[11px] font-semibold text-muted-foreground">
							🎯 Prioridades para mañana
						</FieldLabel>
						{([0, 1, 2] as const).map((index) => (
							<Input
								key={index}
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
						))}
					</FieldGroup>

					{/* Footer */}
					<div className="flex items-center justify-between gap-3 pt-1">
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

function ScoreToggleField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: 1 | 2 | 3 | 4 | 5;
	onChange: (value: 1 | 2 | 3 | 4 | 5) => void;
}) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-[11px] font-semibold text-muted-foreground">
				{label}
			</span>
			{/* Emoji indicator */}
			<div className="text-center text-base leading-none mb-0.5">
				{SCORE_LABELS[value]}
			</div>
			<ToggleGroup
				value={[String(value)]}
				onValueChange={(val: string[]) => {
					const selected = val[val.length - 1];
					if (selected) onChange(Number(selected) as 1 | 2 | 3 | 4 | 5);
				}}
				className="w-full justify-between gap-0.5"
			>
				{SCORES.map((score) => (
					<ToggleGroupItem
						key={score}
						value={String(score)}
						size="sm"
						className="h-7 flex-1 rounded-md text-[11px] font-bold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
					>
						{score}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	);
}
