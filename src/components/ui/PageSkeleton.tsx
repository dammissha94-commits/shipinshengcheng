import { MobilePage, MobileTopBar } from '@/components/wujia/MobileChrome';
import Skeleton from './Skeleton';

interface PageSkeletonProps {
  /** 顶栏标题（可省略） */
  title?: string;
  /** 顶栏返回路径 */
  backHref?: string;
  /** 列表卡片数量 */
  cards?: number;
  /** 是否显示顶部统计栏（3 个迷你统计） */
  withStats?: boolean;
  /** 是否显示搜索条 */
  withSearch?: boolean;
}

/**
 * PageSkeleton — 移动端列表型页面通用骨架屏
 * 适配 members / stories / photos / calendar / meetings 等列表页。
 */
export default function PageSkeleton({
  title,
  backHref,
  cards = 4,
  withStats = true,
  withSearch = true,
}: PageSkeletonProps) {
  return (
    <MobilePage>
      {title !== undefined && <MobileTopBar title={title} backHref={backHref} />}
      <div className="relative z-10 space-y-4 px-5 pb-6 pt-2">
        {withStats && (
          <div className="grid grid-cols-3 gap-2">
            <Skeleton.Box height={56} radius="sm" />
            <Skeleton.Box height={56} radius="sm" />
            <Skeleton.Box height={56} radius="sm" />
          </div>
        )}
        {withSearch && <Skeleton.Box height={44} radius="sm" />}
        <div className="space-y-3">
          {Array.from({ length: cards }).map((_, i) => (
            <Skeleton.Card key={i} />
          ))}
        </div>
      </div>
    </MobilePage>
  );
}
