import React from 'react';
import { cn } from '../../lib/utils';

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, id, className, containerClassName, ...props }, ref) => {
    const inputId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
      <div className={cn('space-y-1 text-left', containerClassName)}>
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold uppercase tracking-wider text-navy/80"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-control border bg-surface px-3 py-2 text-sm text-navy placeholder:text-muted/60 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger font-medium mt-1">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-muted mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);
FormField.displayName = 'FormField';
