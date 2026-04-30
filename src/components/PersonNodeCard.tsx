import type { Person, Relation } from '@/types/domain';
import { getRelationLabel } from '@/types/domain';

interface PersonNodeCardProps {
  person: Person | null;
  relation: Relation;
  onAdd?: () => void;
  isOwner?: boolean;
}

export default function PersonNodeCard({
  person,
  relation,
  onAdd,
  isOwner = false,
}: PersonNodeCardProps) {
  const label = getRelationLabel(relation, person?.gender);

  if (!person) {
    return (
      <button
        onClick={onAdd}
        className="flex flex-col items-center gap-1.5 w-[76px] group"
        aria-label={`添加${label}`}
      >
        <div className="w-14 h-14 rounded-full border-2 border-dashed border-sand
          flex items-center justify-center group-hover:border-gold group-active:scale-95
          transition-all bg-cream">
          <span className="text-2xl leading-none text-muted group-hover:text-gold">+</span>
        </div>
        <span className="text-[11px] text-muted text-center leading-tight">{label}</span>
        <span className="text-[10px] text-sand text-center">添加</span>
      </button>
    );
  }

  const initial = person.name.charAt(0);
  const isClaimed = person.claimStatus === 'claimed';

  return (
    <div className="flex flex-col items-center gap-1.5 w-[76px]">
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center
          text-lg font-semibold select-none shrink-0
          ${isOwner
            ? 'bg-pine text-cream ring-2 ring-gold ring-offset-2 ring-offset-cream'
            : 'bg-sand text-pine'
          }`}
      >
        {initial}
      </div>
      <span className="text-[11px] font-medium text-charcoal text-center truncate w-full leading-tight">
        {person.name}
      </span>
      <span className="text-[10px] text-muted">{label}</span>
      {!isClaimed && !isOwner && (
        <span className="text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded-full leading-tight">
          待认领
        </span>
      )}
    </div>
  );
}
