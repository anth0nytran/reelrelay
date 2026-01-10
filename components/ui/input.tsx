import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, icon, id, ...props }, ref) => {
    const inputId = id || props.name;
    
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-muted group-focus-within:text-brand-primary transition-colors pointer-events-none">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            className={cn(
              'input',
              icon && 'pl-10',
              error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-red-400 animate-enter">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
