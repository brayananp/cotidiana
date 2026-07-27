import React from "react";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/shared/components/ui/field";
import { useFieldContext } from "@/shared/hooks/form-context";

type CheckboxFieldProps = {
	label: string;
	description?: string;
	defaultChecked?: boolean;
	orientation?: "horizontal" | "vertical";
};

export function CheckboxField({
	label,
	description,
	defaultChecked = false,
	orientation = "horizontal",
}: CheckboxFieldProps) {
	const field = useFieldContext<boolean>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
	const [checked, setChecked] = React.useState(defaultChecked);
	return (
		<Field data-invalid={isInvalid} orientation={orientation}>
			<Checkbox
				id={field.name}
				name={field.name}
				checked={checked}
				onCheckedChange={(checked) => setChecked(checked)}
				onBlur={field.handleBlur}
				aria-invalid={isInvalid}
				disabled={field.state.meta.isDirty || !field.state.meta.isValid}
			/>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			{description !== undefined && (
				<FieldDescription>{description}</FieldDescription>
			)}
			{isInvalid && <FieldError errors={field.state.meta.errors} />}
		</Field>
	);
}
