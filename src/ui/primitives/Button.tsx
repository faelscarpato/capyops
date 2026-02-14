import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg border text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 ring-default',
  {
    variants: {
      variant: {
        primary: 'border-transparent bg-[color:var(--primary)] text-white hover:bg-[color:var(--accent-2)]',
        secondary: 'border-default bg-surface-2 text-fg hover:bg-surface',
        ghost: 'border-default bg-surface text-fg hover:bg-surface-2',
        destructive: 'border-transparent bg-[color:var(--danger)] text-white hover:opacity-90'
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-11 px-5'
      }
    },
    defaultVariants: {
      variant: 'ghost',
      size: 'md'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
