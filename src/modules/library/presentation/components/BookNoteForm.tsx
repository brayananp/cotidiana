import { toast } from "#/shared/components/ui/toast";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";
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
	onCancel?: () => void;
};

export function BookNoteForm({
	bookId,
	context,
	note,
	onCompleted,
	onCancel,
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
					toast.add({
						title: "Nota actualizada",
						description: "La nota ha sido actualizada correctamente.",
					});
					onCancel?.();
				} else {
					await libraryDependencies.createNote(bookId, value, context);

					toast.add({
						title: "Nota creada",
						description: "La nota ha sido creada correctamente.",
					});
					onCancel?.();
				}

				form.reset();
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
		<Card>
			<CardHeader>
				<CardTitle>{note ? "Editar nota" : "Nueva nota"}</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					className="flex flex-col gap-3"
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
				>
					<FieldGroup>
						<form.Field name="type">
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor="type">Tipo</FieldLabel>
									<Select
										value={field.state.value}
										onValueChange={(value) =>
											field.handleChange(value as typeof field.state.value)
										}
									>
										<SelectTrigger id="type">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{BOOK_NOTE_TYPES.map((type) => (
												<SelectItem key={type} value={type}>
													{bookNoteTypeLabels[type]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						<form.Field name="page">
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor="page">Página</FieldLabel>
									<Input
										id="page"
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

						<form.Field name="content">
							{(field) => (
								<Field data-invalid={field.state.meta.errors.length > 0}>
									<FieldLabel htmlFor="content">Contenido</FieldLabel>
									<Textarea
										id="content"
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

					{submitError && (
						<p className="text-sm text-destructive">{submitError}</p>
					)}

					{onCancel && (
						<Button variant="outline" size="sm" onClick={() => onCancel()}>
							Cancelar
						</Button>
					)}

					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting]}
					>
						{([canSubmit, isSubmitting]) => (
							<div className="flex justify-end gap-2">
								{note && (
									<Button variant="outline" size="sm" onClick={onCompleted}>
										Cancelar
									</Button>
								)}

								<Button
									type="submit"
									disabled={!canSubmit || isSubmitting}
									size="sm"
								>
									{isSubmitting ? "Guardando…" : "Guardar nota"}
								</Button>
							</div>
						)}
					</form.Subscribe>
				</form>
			</CardContent>
		</Card>
	);
}
