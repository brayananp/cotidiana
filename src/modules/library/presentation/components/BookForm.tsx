import { Alert } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
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
	isOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
};

export function BookForm({
	context,
	book,
	onCompleted,
	isOpen,
	onOpenChange,
}: BookFormProps) {
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
		<Card>
			<CardContent>
				<form
					className="flex flex-col gap-4"
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
				>
					<FieldGroup>
						<form.Field name="title">
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor="title">Título</FieldLabel>
									<Input
										id="title"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										aria-invalid={field.state.meta.errors.length > 0}
									/>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						<form.Field name="author">
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor="author">Autor</FieldLabel>
									<Input
										id="author"
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
										aria-invalid={field.state.meta.errors.length > 0}
									/>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						<form.Field name="status">
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor="status">Estado</FieldLabel>
									<Select
										value={field.state.value}
										onValueChange={(value) =>
											field.handleChange(value as typeof field.state.value)
										}
									>
										<SelectTrigger id="status">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{BOOK_STATUSES.map((status) => (
												<SelectItem key={status} value={status}>
													{bookStatusLabels[status]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						<form.Field name="isbn">
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor="isbn">ISBN</FieldLabel>
									<Input
										id="isbn"
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
										aria-invalid={field.state.meta.errors.length > 0}
									/>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						<form.Field name="pageCount">
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor="pageCount">Total de páginas</FieldLabel>
									<Input
										id="pageCount"
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
										aria-invalid={field.state.meta.errors.length > 0}
									/>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						<form.Field name="currentPage">
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor="currentPage">Página actual</FieldLabel>
									<Input
										id="currentPage"
										type="number"
										min={0}
										value={field.state.value}
										onChange={(event) =>
											field.handleChange(Number(event.target.value))
										}
										aria-invalid={field.state.meta.errors.length > 0}
									/>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						<form.Field name="rating">
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor="rating">Puntuación</FieldLabel>
									<Select
										value={field.state.value?.toString() ?? ""}
										onValueChange={(value) =>
											field.handleChange(value === "" ? null : Number(value))
										}
									>
										<SelectTrigger id="rating">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="">Sin puntuación</SelectItem>
											{[1, 2, 3, 4, 5].map((rating) => (
												<SelectItem key={rating} value={rating.toString()}>
													{rating}/5
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						<form.Field name="tagsText">
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor="tagsText">Etiquetas</FieldLabel>
									<Input
										id="tagsText"
										value={field.state.value}
										placeholder="arquitectura, productividad"
										onChange={(event) => field.handleChange(event.target.value)}
										aria-invalid={field.state.meta.errors.length > 0}
									/>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						<form.Field name="coverUrl">
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor="coverUrl">URL de portada</FieldLabel>
									<Input
										id="coverUrl"
										type="url"
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
										aria-invalid={field.state.meta.errors.length > 0}
									/>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						<form.Field name="description">
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor="description">Descripción</FieldLabel>
									<Textarea
										id="description"
										rows={3}
										value={field.state.value}
										onChange={(event) => field.handleChange(event.target.value)}
										aria-invalid={field.state.meta.errors.length > 0}
									/>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>
					</FieldGroup>

					{submitError && <Alert variant="destructive">{submitError}</Alert>}

					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting]}
					>
						{([canSubmit, isSubmitting]) => (
							<div className="flex justify-end gap-2">
								{book && (
									<Button variant="outline" onClick={onCompleted}>
										Cancelar
									</Button>
								)}

								<Button type="submit" disabled={!canSubmit || isSubmitting}>
									{isSubmitting ? "Guardando…" : "Guardar libro"}
								</Button>
							</div>
						)}
					</form.Subscribe>
				</form>
			</CardContent>
		</Card>
	);
}
