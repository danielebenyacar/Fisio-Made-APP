import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

const CONTROL =
  'block w-full rounded-xl border bg-white px-4 text-base text-brand-900 placeholder:text-brand-400 focus:outline-2 focus:outline-brand-700'

type FieldProps = { id: string; label: string; error?: string; children: ReactNode }

function Field({ id, label, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-semibold">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 font-semibold text-danger-700">
          {error}
        </p>
      )}
    </div>
  )
}

const borderFor = (error?: string) => (error ? 'border-danger-600' : 'border-brand-300')

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string }

export function TextField({ id, label, error, ...props }: TextFieldProps) {
  return (
    <Field id={id} label={label} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${CONTROL} min-h-12 ${borderFor(error)}`}
        {...props}
      />
    </Field>
  )
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; label: string }

export function TextAreaField({ id, label, ...props }: TextAreaFieldProps) {
  return (
    <Field id={id} label={label}>
      <textarea id={id} rows={3} className={`${CONTROL} py-3 ${borderFor()}`} {...props} />
    </Field>
  )
}
