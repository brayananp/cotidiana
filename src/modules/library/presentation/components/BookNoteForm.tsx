import { useForm } from "@tanstack/react-form";
import { type ReactNode, useState } from "react";
import type { LibraryExecutionContext } from "../../application/library-context";
import { BOOK_NOTE_TYPES, type BookNote } from "../../domain/book-note";
import { libraryDependencies } from "../../infrastructure/library.dependencies";
import {
	type BookNoteFormInput,
	bookNoteFormSchema,
} from "../../schemas/book-note-form.schema";
import { bookNoteTypeLabels } from "../labels";

type BookNoteFormProps = {
	bookId: string;
	context: LibraryExecutionContext;
	note?: BookNote | null;
	onCompleted?: () => void;
};

export function BookNoteForm({
	bookId,
	context,
	note,
	onCompleted,
}: BookNoteFormProps) {
	const [submitError, setSubmitError] = useState<string | null>(null);

	const defaultValues: BookNoteFormInput = {
		type: note?.type ?? "note",
		content: note?.content ?? "",
		page: note?.page ?? null,
	};

	const form = useForm({
		defaultValues,

		validators: {
			onSubmit: bookNoteFormSchema,
		},

		onSubmit: async ({ value }) => {
			setSubmitError(null);

			try {
				if (note) {
					await libraryDependencies.updateNote(note.id, value, context);
				} else {
					await libraryDependencies.createNote(bookId, value, context);
				}

				form.reset();
				onCompleted?.();
			} catch (error) {
				setSubmitError(
					error instanceof Error
						? error.message
						: "No fue posible guardar la nota.",
				);
			}
		},
	});

	return (
		<form
			className="space-y-3 rounded-xl border p-4"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<h3 className="font-medium">{note ? "Editar nota" : "Nueva nota"}</h3>

			<div className="grid gap-3 md:grid-cols-[180px_140px_1fr]">
				<form.Field name="type">
					{(field) => (
						<Field label="Tipo" errors={field.state.meta.errors}>
							<select
								value={field.state.value}
								onChange={(event) =>
									field.handleChange(
										event.target.value as typeof field.state.value,
									)
								}
								className="h-10 w-full rounded-md border px-3"
							>
								{BOOK_NOTE_TYPES.map((type) => (
									<option key={type} value={type}>
										{bookNoteTypeLabels[type]}
									</option>
								))}
							</select>
						</Field>
					)}
				</form.Field>

				<form.Field name="page">
					{(field) => (
						<Field label="Página" errors={field.state.meta.errors}>
							<input
								type="number"
								min={1}
								value={field.state.value ?? ""}
								onChange={(event) =>
									field.handleChange(
										event.target.value === ""
											? null
											: Number(event.target.value),
									)
								}
								className="h-10 w-full rounded-md border px-3"
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="content">
					{(field) => (
						<Field label="Contenido" errors={field.state.meta.errors}>
							<textarea
								rows={3}
								value={field.state.value}
								onChange={(event) => field.handleChange(event.target.value)}
								className="w-full rounded-md border px-3 py-2"
							/>
						</Field>
					)}
				</form.Field>
			</div>

			{submitError && <p className="text-sm text-destructive">{submitError}</p>}

			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting]}
			>
				{([canSubmit, isSubmitting]) => (
					<div className="flex justify-end gap-2">
						{note && (
							<button
								type="button"
								className="rounded-md border px-3 py-2 text-sm"
								onClick={onCompleted}
							>
								Cancelar
							</button>
						)}

						<button
							type="submit"
							disabled={!canSubmit || isSubmitting}
							className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
						>
							{isSubmitting ? "Guardando…" : "Guardar nota"}
						</button>
					</div>
				)}
			</form.Subscribe>
		</form>
	);
}

function Field({
	label,
	errors,
	children,
}: {
	label: string;
	errors: readonly unknown[];
	children: ReactNode;
}) {
	return (
		<label className="space-y-1">
			<span className="text-sm font-medium">{label}</span>

			{children}

			{errors.length > 0 && (
				<span className="block text-sm text-destructive">
					{errors.map(getErrorMessage).join(", ")}
				</span>
			)}
		</label>
	);
}

function getErrorMessage(error: unknown): string {
	if (typeof error === "string") {
		return error;
	}

	if (
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof error.message === "string"
	) {
		return error.message;
	}

	return "Valor inválido";
}
