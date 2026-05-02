import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-pine text-cream shadow-[0_1px_3px_rgba(0,0,0,0.15)] hover:bg-pine-light hover:shadow-[0_2px_6px_rgba(0,0,0,0.2)]',
        secondary: 'border border-pine/50 bg-card text-pine hover:bg-pine/5 hover:border-pine',
        ghost: 'text-muted hover:bg-sand/60 hover:text-charcoal',
        gold: 'border border-gold/30 bg-gold/5 text-gold hover:bg-gold/10 hover:border-gold/50',
        danger: 'bg-red-50 text-red-600 hover:bg-red-100',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-11 px-4',
        lg: 'h-12 px-5 text-base',
        icon: 'h-9 w-9 p-0',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, fullWidth, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
