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
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sand/60 text-muted">
          {icon}
        </div>
      )}
      <p className="mb-1 text-base font-medium text-charcoal">{title}</p>
      {description && <p className="mb-5 text-sm leading-relaxed text-muted">{description}</p>}
      {action && (
        <Button type="button" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
