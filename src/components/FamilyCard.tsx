import type { ReactNode } from 'react';

interface FamilyCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function FamilyCard({ children, className = '', onClick }: FamilyCardProps) {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`w-full text-left bg-card rounded-2xl p-4 shadow-sm border border-sand/60
          active:scale-[0.99] transition-transform ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <div
      className={`bg-card rounded-2xl p-4 shadow-sm border border-sand/60 ${className}`}
    >
      {children}
    </div>
  );
}
