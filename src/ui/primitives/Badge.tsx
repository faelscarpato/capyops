import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../cn';

const badgeVariants = cva('badge', {
  variants: {
    variant: {
      neutral: 'badge-neutral',
      success: 'badge-success',
      warning: 'badge-warning',
      danger: 'badge-danger'
    }
  },
  defaultVariants: {
    variant: 'neutral'
  }
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
