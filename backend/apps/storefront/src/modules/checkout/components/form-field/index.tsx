import { clx } from "@modules/common/components/ui"
import React from "react"

type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  name: string
  wrapperClassName?: string
}

/**
 * Plain, wireframe-styled `.form-field` — label above a bordered input.
 * Deliberately a local component (not the shared `common/components/input`)
 * so restyling checkout doesn't also change the account module's forms,
 * which reuse that shared Input elsewhere.
 */
export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, name, className, wrapperClassName, ...props }, ref) => {
    return (
      <div className={clx("flex flex-col gap-1.5", wrapperClassName)}>
        <label htmlFor={name} className="text-[12.5px] font-semibold text-bo-ink-muted">
          {label}
          {props.required && <span className="text-bo-accent"> *</span>}
        </label>
        <input
          ref={ref}
          id={name}
          name={name}
          className={clx(
            "rounded-[7px] border border-bo-line bg-bo-surface px-3 py-2.5 text-[14px] text-bo-ink placeholder:text-bo-ink-faint focus:border-bo-accent focus:outline-none",
            className
          )}
          {...props}
        />
      </div>
    )
  }
)
TextField.displayName = "TextField"

export const SelectField = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; name: string }
>(({ label, name, children, ...props }, ref) => {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-[12.5px] font-semibold text-bo-ink-muted">
        {label}
        {props.required && <span className="text-bo-accent"> *</span>}
      </label>
      <select
        ref={ref}
        id={name}
        name={name}
        className="rounded-[7px] border border-bo-line bg-bo-surface px-3 py-2.5 text-[14px] text-bo-ink focus:border-bo-accent focus:outline-none"
        {...props}
      >
        {children}
      </select>
    </div>
  )
})
SelectField.displayName = "SelectField"
