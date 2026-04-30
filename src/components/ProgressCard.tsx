import { Card } from '@/components/ui';

interface ProgressCardProps {
  memberCount: number;
  completion: number;
}

export default function ProgressCard({ memberCount, completion }: ProgressCardProps) {
  return (
    <Card className="overflow-hidden border-pine/10 bg-pine p-4 text-cream shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="mb-0.5 text-xs text-cream/60">家族完成度</p>
          <p className="text-2xl font-bold">{completion}%</p>
        </div>
        <div className="text-right">
          <p className="mb-0.5 text-xs text-cream/60">成员</p>
          <p className="text-2xl font-bold">{memberCount}</p>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-cream/20">
        <div
          className="h-full rounded-full bg-gold transition-all duration-500"
          style={{ width: `${Math.max(completion, 4)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-cream/60">
        {completion < 30
          ? '添加更多家人，让三代谱更完整'
          : completion < 70
          ? '三代谱已有雏形，可以继续完善'
          : '三代谱已经比较完整，可以邀请家人认领'}
      </p>
    </Card>
  );
}
