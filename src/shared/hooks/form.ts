import { ButtonSubmit } from "#/shared/components/forms/button-submit";
import { createFormHook } from "@tanstack/react-form";
import { CheckboxField } from "@/shared/components/forms/checkbox-field";
import { TextField } from "@/shared/components/forms/text-field";
import { fieldContext, formContext } from "./form-context";

export const { useAppForm } = createFormHook({
	fieldComponents: {
		TextField,
		CheckboxField,
	},
	formComponents: {
		ButtonSubmit,
	},
	fieldContext,
	formContext,
});
