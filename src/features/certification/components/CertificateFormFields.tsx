import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { FormField } from '@/components/common/FormField'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { FormDefinition, FormField as FieldDefinition, FormValues } from '@/types/forms'

interface CertificateFormFieldsProps {
  form: FormDefinition
  register: UseFormRegister<FormValues>
  errors: FieldErrors<FormValues>
}

function CheckboxField({ field, register, error }: FieldProps) {
  const id = `field-${field.name}`
  const errorId = `${id}-error`
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 accent-primary"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-required={field.required || undefined}
          {...register(field.name)}
        />
        <label htmlFor={id} className="text-sm">
          {field.label}
        </label>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

interface FieldProps {
  field: FieldDefinition
  register: UseFormRegister<FormValues>
  error?: string
}

function InputField({ field, register, error }: FieldProps) {
  return (
    <FormField
      label={field.label}
      id={`field-${field.name}`}
      description={field.helpText}
      error={error}
      required={field.required}
    >
      {(control) =>
        field.type === 'select' ? (
          <NativeSelect {...control} className="w-full" {...register(field.name)}>
            <NativeSelectOption value="">Select…</NativeSelectOption>
            {field.options?.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        ) : (
          <Input
            {...control}
            type={field.type === 'textarea' ? 'text' : field.type}
            inputMode={field.type === 'number' ? 'numeric' : undefined}
            {...register(field.name)}
          />
        )
      }
    </FormField>
  )
}

/** Renders a predefined FormDefinition as accessible inputs wired to React Hook Form. */
export function CertificateFormFields({ form, register, errors }: CertificateFormFieldsProps) {
  return (
    <div className="space-y-8">
      {form.sections.map((section) => (
        <fieldset key={section.id} className="space-y-4">
          <legend className="font-heading text-base font-semibold">{section.title}</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            {section.fields.map((field) => {
              const error = errors[field.name]?.message
              return field.type === 'checkbox' ? (
                <div key={field.name} className="sm:col-span-2">
                  <CheckboxField field={field} register={register} error={error} />
                </div>
              ) : (
                <InputField key={field.name} field={field} register={register} error={error} />
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
