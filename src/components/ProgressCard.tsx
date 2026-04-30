interface ProgressCardProps {
  memberCount: number;
  completion: number;
}

export default function ProgressCard({ memberCount, completion }: ProgressCardProps) {
  return (
    <div className="bg-pine rounded-2xl p-4 text-cream">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-cream/60 mb-0.5">家族完成度</p>
          <p className="text-2xl font-bold">{completion}%</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-cream/60 mb-0.5">成员</p>
          <p className="text-2xl font-bold">{memberCount}</p>
        </div>
      </div>
      <div className="h-2 bg-cream/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-gold rounded-full transition-all duration-500"
          style={{ width: `${Math.max(completion, 4)}%` }}
        />
      </div>
      <p className="text-xs text-cream/50 mt-2">
        {completion < 30
          ? '添加更多家人，让家谱更完整'
          : completion < 70
          ? '家谱已有雏形，继续完善吧'
          : '家谱已非常完整，欢迎邀请家人认领'}
      </p>
    </div>
  );
}
