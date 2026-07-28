import { useRouteContext } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TASK_PRIORITIES } from "@/modules/tasks/domain/task";
import {
	SETTINGS_LOCALES,
	START_PAGES,
	TIME_FORMATS,
	type UserSettings,
} from "../../domain/user-settings";
import { settingsDependencies } from "../../infrastructure/settings.dependencies";
import type { UserSettingsFormInput } from "../../schemas/user-settings-form.schema";
import { useUserSettings } from "../hooks/use-user-settings";

export function PreferencesSettingsPage() {
	const { access } = useRouteContext({
		from: "/_app",
	});

	const identity = access.localIdentity;

	if (!identity) {
		return <p>No hay una identidad local activa.</p>;
	}

	return (
		<PreferencesContent userId={identity.userId} deviceId={identity.deviceId} />
	);
}

function PreferencesContent({
	userId,
	deviceId,
}: {
	userId: string;
	deviceId: string;
}) {
	const settings = useUserSettings(userId);

	if (!settings) {
		return <p>Cargando preferencias…</p>;
	}

	return (
		<PreferencesForm
			key={`${settings.id}:${settings.version}`}
			settings={settings}
			deviceId={deviceId}
		/>
	);
}

function PreferencesForm({
	settings,
	deviceId,
}: {
	settings: UserSettings;
	deviceId: string;
}) {
	const [values, setValues] = useState<UserSettingsFormInput>({
		locale: settings.locale,
		weekStartsOn: settings.weekStartsOn,
		timeFormat: settings.timeFormat,
		startPage: settings.startPage,
		defaultTaskPriority: settings.defaultTaskPriority,
		defaultReminderMinutes: settings.defaultReminderMinutes,
		denseMode: settings.denseMode,
	});
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		document.documentElement.dataset.density = settings.denseMode
			? "compact"
			: "comfortable";
	}, [settings.denseMode]);

	return (
		<section className="space-y-6">
			<header>
				<h1 className="text-2xl font-semibold">Preferencias</h1>
				<p className="text-sm text-muted-foreground">
					Estas preferencias se guardan localmente y se sincronizan con Turso.
				</p>
			</header>

			<form
				className="space-y-5 rounded-xl border p-4"
				onSubmit={async (event) => {
					event.preventDefault();
					setBusy(true);
					setMessage(null);
					setError(null);

					try {
						await settingsDependencies.update(
							settings.userId,
							deviceId,
							values,
						);
						setMessage("Preferencias guardadas.");
					} catch (caught) {
						setError(
							caught instanceof Error
								? caught.message
								: "No fue posible guardar las preferencias.",
						);
					} finally {
						setBusy(false);
					}
				}}
			>
				<div className="grid gap-4 md:grid-cols-2">
					<SelectField
						label="Idioma"
						value={values.locale}
						options={SETTINGS_LOCALES.map((value) => ({
							value,
							label: value === "es" ? "Español" : "English",
						}))}
						onChange={(value) =>
							setValues((current) => ({
								...current,
								locale: value as UserSettingsFormInput["locale"],
							}))
						}
					/>

					<SelectField
						label="Primer día de la semana"
						value={String(values.weekStartsOn)}
						options={[
							{ value: "1", label: "Lunes" },
							{ value: "0", label: "Domingo" },
						]}
						onChange={(value) =>
							setValues((current) => ({
								...current,
								weekStartsOn: Number(value) as 0 | 1,
							}))
						}
					/>

					<SelectField
						label="Formato horario"
						value={values.timeFormat}
						options={TIME_FORMATS.map((value) => ({
							value,
							label: value === "24h" ? "24 horas" : "12 horas",
						}))}
						onChange={(value) =>
							setValues((current) => ({
								...current,
								timeFormat: value as UserSettingsFormInput["timeFormat"],
							}))
						}
					/>

					<SelectField
						label="Página inicial"
						value={values.startPage}
						options={START_PAGES.map((value) => ({
							value,
							label: startPageLabel(value),
						}))}
						onChange={(value) =>
							setValues((current) => ({
								...current,
								startPage: value as UserSettingsFormInput["startPage"],
							}))
						}
					/>

					<SelectField
						label="Prioridad predeterminada"
						value={values.defaultTaskPriority}
						options={TASK_PRIORITIES.map((value) => ({
							value,
							label: priorityLabel(value),
						}))}
						onChange={(value) =>
							setValues((current) => ({
								...current,
								defaultTaskPriority:
									value as UserSettingsFormInput["defaultTaskPriority"],
							}))
						}
					/>

					<label className="space-y-2">
						<span className="text-sm font-medium">
							Recordatorio predeterminado
						</span>
						<input
							type="number"
							min={1}
							max={10_080}
							value={values.defaultReminderMinutes}
							onChange={(event) =>
								setValues((current) => ({
									...current,
									defaultReminderMinutes: Number(event.target.value),
								}))
							}
							className="h-10 w-full rounded-md border px-3"
						/>
						<span className="text-xs text-muted-foreground">
							Minutos antes o desde el momento actual, según el formulario.
						</span>
					</label>
				</div>

				<label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
					<input
						type="checkbox"
						checked={values.denseMode}
						onChange={(event) =>
							setValues((current) => ({
								...current,
								denseMode: event.target.checked,
							}))
						}
					/>
					Usar una interfaz más compacta
				</label>

				{message && <p className="text-sm text-emerald-600">{message}</p>}

				{error && <p className="text-sm text-destructive">{error}</p>}

				<button
					type="submit"
					disabled={busy}
					className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
				>
					{busy ? "Guardando…" : "Guardar preferencias"}
				</button>
			</form>
		</section>
	);
}

function SelectField({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: string;
	options: Array<{ value: string; label: string }>;
	onChange: (value: string) => void;
}) {
	return (
		<label className="space-y-2">
			<span className="text-sm font-medium">{label}</span>
			<select
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className="h-10 w-full rounded-md border px-3"
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</label>
	);
}

function startPageLabel(value: string): string {
	return (
		{
			dashboard: "Dashboard",
			tasks: "Tareas",
			scheduling: "Agenda",
			reminders: "Recordatorios",
			library: "Biblioteca",
		}[value] ?? value
	);
}

function priorityLabel(value: string): string {
	return (
		{
			none: "Sin prioridad",
			low: "Baja",
			medium: "Media",
			high: "Alta",
			urgent: "Urgente",
		}[value] ?? value
	);
}
