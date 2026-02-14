import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../cn';

const inputVariants = cva('input', {
  variants: {
    size: {
      sm: 'h-8 text-xs',
      md: 'h-10 text-sm',
      lg: 'h-11 text-base'
    }
  },
  defaultVariants: {
    size: 'md'
  }
});

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, label, error, id, ...props }, ref) => {
    const inputId = id ?? React.useId();
    return (
      <label htmlFor={inputId} className="block space-y-1">
        {label ? <span className="label">{label}</span> : null}
        <input ref={ref} id={inputId} className={cn(inputVariants({ size }), className)} aria-invalid={!!error} {...props} />
        {error ? <span className="text-xs text-[color:var(--danger)]">{error}</span> : null}
      </label>
    );
  }
);

Input.displayName = 'Input';

export { Input };
