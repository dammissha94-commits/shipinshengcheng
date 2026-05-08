import type { FamilySpace } from '@/types/domain';
import FamilySwitcher from './FamilySwitcher';

interface HomeHeaderProps {
  /** 当前家堂 */
  current: FamilySpace;
  /** 用户所属的全部家堂；只有 1 个时 FamilySwitcher 退化为简单胶囊 */
  families: FamilySpace[];
  /** 设置入口路由 */
  settingsHref?: string;
}

/**
 * HomeHeader — 数字家堂首页顶栏
 * 左：吾家祠堂主标题
 * 右：FamilySwitcher（单家堂时是胶囊；多家堂时下拉切换）
 */
export default function HomeHeader({
  current,
  families,
  settingsHref = '/family/settings',
}: HomeHeaderProps) {
  return (
    <header className="relative z-10 mt-4 flex items-center justify-between">
      <div className="flex items-end gap-2">
        <h1 className="font-serif text-[34px] font-black leading-none tracking-[0.16em] text-[var(--ink-2)]">
          吾家祠堂
        </h1>
      </div>
      <FamilySwitcher current={current} families={families} settingsHref={settingsHref} />
    </header>
  );
}
