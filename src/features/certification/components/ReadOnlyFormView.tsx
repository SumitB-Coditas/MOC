import { formatCalendarDate } from '@/lib/date'
import type { FormDefinition, FormField, FormValues } from '@/types/forms'

function display(field: FormField, value: string | boolean | undefined): string {
  if (value === undefined || value === '') return '-'
  if (field.type === 'checkbox') return value ? 'Yes' : 'No'
  if (field.type === 'date') return formatCalendarDate(String(value))
  if (field.type === 'select') {
    return field.options?.find((option) => option.value === value)?.label ?? String(value)
  }
  return String(value)
}

/** Renders submitted (or draft) values against the form they were entered on. */
export function ReadOnlyFormView({ form, values }: { form: FormDefinition; values?: FormValues }) {
  return (
    <div className="space-y-6">
      {form.sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <h3 className="font-medium">{section.title}</h3>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {section.fields.map((field) => (
              <div key={field.name} className="space-y-1">
                <dt className="text-sm text-muted-foreground">{field.label}</dt>
                <dd className="font-medium break-words">{display(field, values?.[field.name])}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}
