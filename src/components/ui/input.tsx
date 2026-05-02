import * as React from 'react';
import { cn } from '@/lib/utils';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border-2 border-sand bg-card px-4 py-3 text-[15px] text-charcoal placeholder:text-muted/50 transition-all duration-200 focus:border-pine focus:outline-none focus:shadow-[0_0_0_3px_rgba(30,58,47,0.08)] disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    />
  );
}
