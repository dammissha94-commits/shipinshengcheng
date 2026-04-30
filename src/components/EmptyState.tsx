import type { ReactNode } from 'react';

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
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-sand/60 flex items-center justify-center mb-4 text-muted">
          {icon}
        </div>
      )}
      <p className="text-base font-medium text-charcoal mb-1">{title}</p>
      {description && (
        <p className="text-sm text-muted mb-5">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 bg-pine text-cream text-sm font-semibold rounded-xl
            hover:bg-pine-light transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
