
import { ButtonSubmit } from "#/shared/components/forms/button-submit";
import { CheckboxField } from "@/shared/components/forms/checkbox-field";
import { TextField } from "@/shared/components/forms/text-field";
import { createFormHook } from "@tanstack/react-form";
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