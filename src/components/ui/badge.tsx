import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-relaxed',
  {
    variants: {
      variant: {
        pine: 'bg-pine/10 text-pine',
        gold: 'bg-gold/10 text-gold',
        sand: 'bg-sand/70 text-muted',
        cream: 'bg-cream text-muted',
        success: 'bg-#F0E6D5 text-#8D6E63',
        danger: 'bg-red-50 text-red-600',
      },
    },
    defaultVariants: {
      variant: 'sand',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
