import { useEffect, useState } from "react";
import type { DashboardExecutionContext } from "../../application/dashboard-context";
import type { DailyReview } from "../../domain/daily-review";
import { dashboardDependencies } from "../../infrastructure/dashboard.dependencies";
import type { DailyReviewFormInput } from "../../schemas/daily-review-form.schema";

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
		<form
			className="space-y-4 rounded-xl border p-4"
			onSubmit={async (event) => {
				event.preventDefault();
				setBusy(true);
				setMessage(null);
				setError(null);

				try {
					await dashboardDependencies.upsertReview(reviewDate, values, context);
					setMessage(
						values.completed
							? "Revisión diaria completada."
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
			<div>
				<h2 className="font-semibold">Revisión diaria</h2>
				<p className="text-sm text-muted-foreground">
					Registra cómo terminó el día y prepara las prioridades de mañana.
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-3">
				<ScoreField
					label="Ánimo"
					value={values.mood}
					onChange={(mood) => setValues((v) => ({ ...v, mood }))}
				/>
				<ScoreField
					label="Energía"
					value={values.energy}
					onChange={(energy) => setValues((v) => ({ ...v, energy }))}
				/>
				<ScoreField
					label="Productividad"
					value={values.productivity}
					onChange={(productivity) =>
						setValues((v) => ({ ...v, productivity }))
					}
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<TextArea
					label="Logros"
					value={values.wins}
					onChange={(wins) => setValues((v) => ({ ...v, wins }))}
				/>
				<TextArea
					label="Bloqueos"
					value={values.blockers}
					onChange={(blockers) => setValues((v) => ({ ...v, blockers }))}
				/>
			</div>

			<TextArea
				label="Notas"
				value={values.notes}
				onChange={(notes) => setValues((v) => ({ ...v, notes }))}
				rows={3}
			/>

			<div className="space-y-2">
				<span className="text-sm font-medium">Prioridades para mañana</span>
				{[0, 1, 2].map((index) => (
					<input
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
						className="h-10 w-full rounded-md border px-3"
					/>
				))}
			</div>

			<label className="flex items-center gap-2 text-sm">
				<input
					type="checkbox"
					checked={values.completed}
					onChange={(event) =>
						setValues((current) => ({
							...current,
							completed: event.target.checked,
						}))
					}
				/>
				Marcar la revisión como completada
			</label>

			{message && <p className="text-sm text-green-700">{message}</p>}
			{error && <p className="text-sm text-destructive">{error}</p>}

			<div className="flex justify-end">
				<button
					type="submit"
					disabled={busy}
					className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
				>
					{busy
						? "Guardando…"
						: values.completed
							? "Completar revisión"
							: "Guardar borrador"}
				</button>
			</div>
		</form>
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

function ScoreField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: 1 | 2 | 3 | 4 | 5;
	onChange: (value: 1 | 2 | 3 | 4 | 5) => void;
}) {
	return (
		<label className="space-y-2">
			<span className="text-sm font-medium">{label}</span>
			<select
				value={value}
				onChange={(event) =>
					onChange(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)
				}
				className="h-10 w-full rounded-md border px-3"
			>
				{[1, 2, 3, 4, 5].map((score) => (
					<option key={score} value={score}>
						{score}/5
					</option>
				))}
			</select>
		</label>
	);
}

function TextArea({
	label,
	value,
	onChange,
	rows = 4,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	rows?: number;
}) {
	return (
		<label className="space-y-2">
			<span className="text-sm font-medium">{label}</span>
			<textarea
				rows={rows}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className="w-full rounded-md border px-3 py-2"
			/>
		</label>
	);
}
