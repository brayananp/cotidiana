import { useFormContext } from "#/shared/hooks/form-context"
import { cn } from "#/shared/lib/utils"
import { Button } from "../ui/button"

interface ButtonSubmitProps {
    children: React.ReactNode
    className?: string
    disabled?: boolean
    loading?: boolean
    label?: string
}

export function ButtonSubmit({ children, className, disabled, loading, label  }: ButtonSubmitProps) {
    const form = useFormContext()
    return (
        <form.Subscribe selector={(state) => state.isSubmitting}>
            {isSubmitting => (
                 <Button
                    className={cn(className)}
                    type="submit"
                    disabled={disabled || isSubmitting || loading}
                 >
                    {loading ? "Guardando..." : label || children}
                 </Button>
            )}
        </form.Subscribe>
        
    )
}