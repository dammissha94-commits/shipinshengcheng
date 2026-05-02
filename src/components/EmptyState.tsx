import type { ReactNode } from 'react';
import { Button } from '@/components/ui';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-sand/50 text-muted/60">
          {icon}
        </div>
      )}
      <p className="mb-1.5 text-[16px] font-semibold text-charcoal">{title}</p>
      {description && <p className="mb-6 text-[14px] leading-relaxed text-muted max-w-[260px]">{description}</p>}
      {action && (
        <Button type="button" onClick={action.onClick} size="md">
          {action.label}
        </Button>
      )}
    </div>
  );
}
