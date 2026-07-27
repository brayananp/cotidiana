import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/shared/components/ui/field";

import { Input } from "@/shared/components/ui/input";
import { useFieldContext } from "@/shared/hooks/form-context";

type TextFieldProps = {
	label: string;
	description?: string;
	autoComplete?: string;
	placeholder?: string;
	type?: "text" | "email" | "tel" | "password";
	hideIcon?: boolean;
	disabled?: boolean;
};

export function TextField({
	label,
	description,
	autoComplete,
	placeholder,
	type = "text",
	disabled = false,
}: TextFieldProps) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			
				<Input
					id={field.name}
					name={field.name}
					type={type}
					autoComplete={autoComplete}
					placeholder={placeholder}
					value={field.state.value}
					onBlur={field.handleBlur}
					onChange={(e) => field.handleChange(e.target.value)}
					aria-invalid={isInvalid}
					disabled={disabled}
				/>
			{description !== undefined && (
				<FieldDescription>{description}</FieldDescription>
			)}
			{isInvalid && <FieldError errors={field.state.meta.errors} />}
		</Field>
	);
}