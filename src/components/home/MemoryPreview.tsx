interface MemoryPreviewProps {
  title: string;
  meta: string;
  /** 标签：照片 / 手记 / 故事 */
  tag?: string;
}

/**
 * MemoryPreview — 「最近补充的记忆」面板内的左侧条目预览
 * 不含真实图片，仅用占位网格示意（避免上传真实照片相关红线）。
 */
export default function MemoryPreview({ title, meta, tag = '记忆' }: MemoryPreviewProps) {
  return (
    <div className="flex min-h-[74px] items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--line-1)] bg-[var(--surface-1)] p-2">
      <div className="grid h-[64px] w-[76px] shrink-0 grid-cols-3 gap-1 overflow-hidden rounded-lg bg-[var(--surface-2)] p-2 grayscale">
        {Array.from({ length: 9 }).map((_, index) => (
          <span key={index} className="rounded-full bg-[var(--ink-1)] opacity-25" />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-[var(--ink-1)]">{title}</p>
        <p className="mt-1 truncate text-[13px] text-[var(--ink-3)]">{meta}</p>
        <span className="mt-2 inline-flex rounded-md border border-[var(--line-1)] bg-[var(--surface-2)] px-2 py-0.5 text-[12px] text-[var(--gold)]">
          {tag}
        </span>
      </div>
    </div>
  );
}
