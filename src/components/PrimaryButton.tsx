import Link from 'next/link';
import type { ReactNode } from 'react';

interface PrimaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  fullWidth?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

export default function PrimaryButton({
  children,
  onClick,
  href,
  disabled = false,
  variant = 'primary',
  fullWidth = true,
  type = 'button',
  className = '',
}: PrimaryButtonProps) {
  const base = `inline-flex items-center justify-center rounded-xl px-6 py-3.5
    text-base font-semibold transition-all duration-150 select-none
    ${fullWidth ? 'w-full' : ''}
    ${disabled ? 'opacity-50 pointer-events-none' : 'active:scale-[0.98]'}`;

  const variants = {
    primary: 'bg-pine text-cream hover:bg-pine-light shadow-sm',
    outline: 'border-2 border-pine text-pine hover:bg-pine/5',
    ghost: 'text-pine hover:bg-pine/8',
  };

  const cls = `${base} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}
