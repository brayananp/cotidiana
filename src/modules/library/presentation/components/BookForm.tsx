import { useForm } from "@tanstack/react-form";
import { type ReactNode, useState } from "react";
import type { LibraryExecutionContext } from "../../application/library-context";
import { BOOK_STATUSES, type Book } from "../../domain/book";
import { libraryDependencies } from "../../infrastructure/library.dependencies";
import {
	type BookFormInput,
	bookFormSchema,
} from "../../schemas/book-form.schema";
import { bookStatusLabels } from "../labels";

type BookFormProps = {
	context: LibraryExecutionContext;
	book?: Book | null;
	onCompleted?: () => void;
};

export function BookForm({ context, book, onCompleted }: BookFormProps) {
	const [submitError, setSubmitError] = useState<string | null>(null);

	const defaultValues: BookFormInput = {
		title: book?.title ?? "",
		author: book?.author ?? "",
		isbn: book?.isbn ?? "",
		description: book?.description ?? "",
		coverUrl: book?.coverUrl ?? "",
		status: book?.status ?? "want_to_read",
		pageCount: book?.pageCount ?? null,
		currentPage: book?.currentPage ?? 0,
		rating: book?.rating ?? null,
		tagsText: book?.tags.join(", ") ?? "",
	};

	const form = useForm({
		defaultValues,

		validators: {
			onSubmit: bookFormSchema,
		},

		onSubmit: async ({ value }) => {
			setSubmitError(null);

			try {
				if (book) {
					await libraryDependencies.updateBook(book.id, value, context);
				} else {
					await libraryDependencies.createBook(value, context);
				}

				form.reset();
				onCompleted?.();
			} catch (error) {
				setSubmitError(
					error instanceof Error
						? error.message
						: "No fue posible guardar el libro.",
				);
			}
		},
	});

	return (
		<form
			className="space-y-4 rounded-xl border p-4"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			<div>
				<h2 className="font-semibold">
					{book ? "Editar libro" : "Nuevo libro"}
				</h2>

				<p className="text-sm text-muted-foreground">
					El catálogo se guarda primero en este dispositivo.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<form.Field name="title">
					{(field) => (
						<Field label="Título" errors={field.state.meta.errors}>
							<input
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								className="h-10 w-full rounded-md border px-3"
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="author">
					{(field) => (
						<Field label="Autor" errors={field.state.meta.errors}>
							<input
								value={field.state.value}
								onChange={(event) => field.handleChange(event.target.value)}
								className="h-10 w-full rounded-md border px-3"
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="status">
					{(field) => (
						<Field label="Estado" errors={field.state.meta.errors}>
							<select
								value={field.state.value}
								onChange={(event) =>
									field.handleChange(
										event.target.value as typeof field.state.value,
									)
								}
								className="h-10 w-full rounded-md border px-3"
							>
								{BOOK_STATUSES.map((status) => (
									<option key={status} value={status}>
										{bookStatusLabels[status]}
									</option>
								))}
							</select>
						</Field>
					)}
				</form.Field>

				<form.Field name="isbn">
					{(field) => (
						<Field label="ISBN" errors={field.state.meta.errors}>
							<input
								value={field.state.value}
								onChange={(event) => field.handleChange(event.target.value)}
								className="h-10 w-full rounded-md border px-3"
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="pageCount">
					{(field) => (
						<Field label="Total de páginas" errors={field.state.meta.errors}>
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

				<form.Field name="currentPage">
					{(field) => (
						<Field label="Página actual" errors={field.state.meta.errors}>
							<input
								type="number"
								min={0}
								value={field.state.value}
								onChange={(event) =>
									field.handleChange(Number(event.target.value))
								}
								className="h-10 w-full rounded-md border px-3"
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="rating">
					{(field) => (
						<Field label="Puntuación" errors={field.state.meta.errors}>
							<select
								value={field.state.value ?? ""}
								onChange={(event) =>
									field.handleChange(
										event.target.value === ""
											? null
											: Number(event.target.value),
									)
								}
								className="h-10 w-full rounded-md border px-3"
							>
								<option value="">Sin puntuación</option>
								{[1, 2, 3, 4, 5].map((rating) => (
									<option key={rating} value={rating}>
										{rating}/5
									</option>
								))}
							</select>
						</Field>
					)}
				</form.Field>

				<form.Field name="tagsText">
					{(field) => (
						<Field label="Etiquetas" errors={field.state.meta.errors}>
							<input
								value={field.state.value}
								placeholder="arquitectura, productividad"
								onChange={(event) => field.handleChange(event.target.value)}
								className="h-10 w-full rounded-md border px-3"
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="coverUrl">
					{(field) => (
						<Field label="URL de portada" errors={field.state.meta.errors}>
							<input
								type="url"
								value={field.state.value}
								onChange={(event) => field.handleChange(event.target.value)}
								className="h-10 w-full rounded-md border px-3"
							/>
						</Field>
					)}
				</form.Field>

				<form.Field name="description">
					{(field) => (
						<Field label="Descripción" errors={field.state.meta.errors}>
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

			{submitError && (
				<p
					role="alert"
					className="rounded-md border border-destructive/40 p-3 text-sm text-destructive"
				>
					{submitError}
				</p>
			)}

			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting]}
			>
				{([canSubmit, isSubmitting]) => (
					<div className="flex justify-end gap-2">
						{book && (
							<button
								type="button"
								className="h-10 rounded-md border px-4"
								onClick={onCompleted}
							>
								Cancelar
							</button>
						)}

						<button
							type="submit"
							disabled={!canSubmit || isSubmitting}
							className="h-10 rounded-md bg-primary px-4 text-primary-foreground disabled:opacity-50"
						>
							{isSubmitting ? "Guardando…" : "Guardar libro"}
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
		<label className="space-y-2">
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
