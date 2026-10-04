import { useId, type ReactNode } from 'react'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'

/** Accessibility attributes FormField hands to its control. Spread them onto the input. */
export interface FormFieldControlProps {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
  'aria-required'?: true
}

interface FormFieldProps {
  label: string
  /** Explicit control id; generated when omitted. */
  id?: string
  description?: ReactNode
  error?: string
  required?: boolean
  className?: string
  /** Render prop so any control (Input, select, checkbox…) gets the wiring. */
  children: (control: FormFieldControlProps) => ReactNode
}

/**
 * Label + control + description + error, with ids and ARIA attributes wired together.
 * Library-agnostic: works with plain inputs now and React Hook Form `register()` later.
 */
export function FormField({
  label,
  id,
  description,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const descriptionId = description ? `${controlId}-description` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={controlId}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        )}
      </FieldLabel>
      {children({
        id: controlId,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        'aria-required': required ? true : undefined,
      })}
      {description && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}
