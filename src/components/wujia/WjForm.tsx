'use client';

import { forwardRef } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

interface WjFormRowProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function WjFormRow({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: WjFormRowProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1 text-[14px] font-medium text-[var(--ink-2)]"
      >
        <span>{label}</span>
        {required && <span className="text-[var(--terracotta)]">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] leading-5 text-[var(--terracotta)]">{error}</p>
      ) : hint ? (
        <p className="text-[12px] leading-5 text-[var(--ink-3)]">{hint}</p>
      ) : null}
    </div>
  );
}

type WjInputProps = InputHTMLAttributes<HTMLInputElement>;

export const WjInput = forwardRef<HTMLInputElement, WjInputProps>(
  function WjInput({ className, ...props }, ref) {
    return <input ref={ref} className={cn('wj-input', className)} {...props} />;
  }
);

type WjTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const WjTextarea = forwardRef<HTMLTextAreaElement, WjTextareaProps>(
  function WjTextarea({ className, rows = 4, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn('wj-input', className)}
        {...props}
      />
    );
  }
);

interface WjSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
}

export const WjSelect = forwardRef<HTMLSelectElement, WjSelectProps>(
  function WjSelect({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn('wj-input', className)} {...props}>
        {children}
      </select>
    );
  }
);

interface WjToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function WjToggle({
  checked,
  onChange,
  disabled,
  ariaLabel,
  className,
}: WjToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      data-on={checked ? 'true' : 'false'}
      onClick={() => onChange(!checked)}
      className={cn(
        'wj-toggle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] disabled:opacity-50',
        className
      )}
    />
  );
}

interface WjButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export function WjButton({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: WjButtonProps & { type?: 'button' | 'submit' | 'reset' }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-[14px] font-semibold transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed';
  const sizeCls =
    size === 'lg' ? 'h-[52px] px-6 text-[16px]' : 'h-11 px-5 text-[14px]';
  const variantCls =
    variant === 'primary'
      ? 'bg-gradient-to-r from-[var(--walnut)] to-[var(--walnut-light)] text-white shadow-[0_14px_26px_rgba(90,53,36,0.24)]'
      : variant === 'secondary'
      ? 'border border-[var(--line-1)] bg-[var(--surface-1)] text-[var(--ink-2)]'
      : variant === 'danger'
      ? 'border border-[var(--terracotta)] bg-white text-[var(--terracotta)]'
      : 'text-[var(--ink-2)] hover:bg-[var(--surface-3)]';
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(base, sizeCls, variantCls, className)}
      {...props}
    >
      {loading ? '处理中…' : children}
    </button>
  );
}
