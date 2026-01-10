import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, icon, id, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-surface-muted"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-muted">
              {icon}
            </div>
          )}
          <input
            type={type}
            id={id}
            className={cn(
              "flex h-11 w-full rounded-xl border border-surface-border bg-surface-card px-3 py-2 text-sm text-white placeholder:text-surface-muted focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all",
              icon && "pl-10",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
