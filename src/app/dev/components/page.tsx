'use client';

import { notFound } from 'next/navigation';
import { CalendarDays, Mail, Network, ScrollText, UserPlus, Users } from 'lucide-react';
import {
  ActionCard,
  DashboardStat,
  HomePanel,
  MetricCard,
  TodayCard,
} from '@/components/home';
import EmptyState from '@/components/wujia/EmptyState';
import StatusBadge from '@/components/wujia/StatusBadge';
import {
  NoActivityIllustration,
  NoCalendarIllustration,
  NoMeetingsIllustration,
  NoMembersIllustration,
  NoPhotosIllustration,
  NoStoriesIllustration,
} from '@/components/illustrations';
import Skeleton from '@/components/ui/Skeleton';
import { FadeIn, Stagger } from '@/components/motion';

/**
 * /dev/components — 设计系统活体陈列馆（轻量替代 Storybook）
 *
 * 仅在 NODE_ENV !== 'production' 可访问。
 * 用途：
 *   - 设计师 / 新人快速查看设计 token 与组件全貌
 *   - 视觉回归对比基线
 *
 * 不接入任何业务数据，纯静态展示。
 */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <main className="wj-page min-h-screen px-6 py-10">
      <div className="mx-auto max-w-[920px] space-y-12">
        <header className="space-y-2">
          <p className="text-[12px] tracking-[0.2em] text-[var(--ink-3)]">
            DESIGN SYSTEM SHOWCASE
          </p>
          <h1 className="font-serif text-[40px] font-black tracking-[0.04em] text-[var(--ink-1)]">
            吾家祠堂 · 设计系统
          </h1>
          <p className="max-w-[640px] text-[15px] text-[var(--ink-2)]">
            集中陈列调色板、阴影、圆角、组件、插画与动效。修改 globals.css 的 token 后，本页会同步反映。
          </p>
        </header>

        {/* ---------- 调色板 ---------- */}
        <Section title="1 · 调色板（Palette）">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Swatch name="surface-1" varName="--surface-1" textOn="ink-1" />
            <Swatch name="surface-2" varName="--surface-2" textOn="ink-1" />
            <Swatch name="surface-3" varName="--surface-3" textOn="ink-1" />
            <Swatch name="ink-1" varName="--ink-1" textOn="surface-1" />
            <Swatch name="ink-2" varName="--ink-2" textOn="surface-1" />
            <Swatch name="ink-3" varName="--ink-3" textOn="surface-1" />
            <Swatch name="walnut" varName="--walnut" textOn="surface-1" />
            <Swatch name="walnut-light" varName="--walnut-light" textOn="surface-1" />
            <Swatch name="gold" varName="--gold" textOn="ink-1" />
            <Swatch name="gold-light" varName="--gold-light" textOn="ink-1" />
            <Swatch name="jade" varName="--jade" textOn="surface-1" />
            <Swatch name="terracotta" varName="--terracotta" textOn="surface-1" />
          </div>
        </Section>

        {/* ---------- 圆角 ---------- */}
        <Section title="2 · 圆角（Radius · 6 档）">
          <div className="flex flex-wrap items-end gap-4">
            {(['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((r) => (
              <div key={r} className="flex flex-col items-center gap-2">
                <div
                  className="h-20 w-20 bg-[var(--walnut)]"
                  style={{ borderRadius: `var(--radius-${r})` }}
                />
                <span className="text-[12px] text-[var(--ink-3)]">--radius-{r}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ---------- 阴影 ---------- */}
        <Section title="3 · 阴影（Elevation · 3 档）">
          <div className="grid grid-cols-3 gap-4">
            {(['elev-1', 'elev-2', 'elev-3'] as const).map((e) => (
              <div
                key={e}
                className="flex h-28 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-1)]"
                style={{ boxShadow: `var(--${e})` }}
              >
                <span className="text-[13px] font-medium text-[var(--ink-2)]">--{e}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ---------- 字号节奏 ---------- */}
        <Section title="4 · 字号节奏">
          <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--line-1)] bg-[var(--surface-1)] p-5">
            <p className="font-serif text-[40px] font-black text-[var(--ink-1)]">家堂主标 40</p>
            <p className="font-serif text-[28px] font-bold text-[var(--ink-1)]">区块大标 28</p>
            <p className="text-[20px] font-bold text-[var(--ink-1)]">面板标题 20</p>
            <p className="text-[16px] text-[var(--ink-1)]">正文（主）16</p>
            <p className="text-[14px] text-[var(--ink-2)]">正文（次）14</p>
            <p className="text-[12px] tracking-[0.16em] text-[var(--ink-3)]">EYEBROW 12</p>
          </div>
        </Section>

        {/* ---------- 业务组件 ---------- */}
        <Section title="5 · 首页组件">
          <FadeIn className="space-y-3">
            <Stagger className="grid grid-cols-3 gap-2" stagger={0.05}>
              <Stagger.Item>
                <MetricCard icon={<Users size={22} />} label="家人" value={12} unit="位" tone="walnut" />
              </Stagger.Item>
              <Stagger.Item>
                <MetricCard icon={<Users size={22} />} label="已认领" value={9} unit="位" tone="jade" />
              </Stagger.Item>
              <Stagger.Item>
                <MetricCard icon={<ScrollText size={22} />} label="三代谱" value={3} unit="层" tone="terracotta" />
              </Stagger.Item>
            </Stagger>
            <Stagger className="grid grid-cols-4 gap-2" stagger={0.05}>
              <Stagger.Item>
                <ActionCard href="#" icon={<UserPlus size={26} />} label="添加亲属" tone="terracotta" />
              </Stagger.Item>
              <Stagger.Item>
                <ActionCard href="#" icon={<Mail size={26} />} label="邀请认领" tone="jade" />
              </Stagger.Item>
              <Stagger.Item>
                <ActionCard href="#" icon={<Network size={26} />} label="家族树" tone="walnut" />
              </Stagger.Item>
              <Stagger.Item>
          <ActionCard href="#" icon={<ScrollText size={26} />} label="人生记忆" tone="gold" />
              </Stagger.Item>
            </Stagger>
            <HomePanel icon={<CalendarDays size={18} />} title="今日家庭节点" href="#">
              <TodayCard title="王氏家堂 · 资料持续完善" hint="继续补充生日、故事与亲属关系" />
            </HomePanel>
            <HomePanel icon={<ScrollText size={18} />} title="家堂数据看板" href="#">
              <div className="grid grid-cols-4 gap-2">
                <DashboardStat icon={<Users size={16} />} label="家族成员" value={12} unit="位" tone="terracotta" />
                <DashboardStat icon={<Users size={16} />} label="已认领" value={9} unit="位" tone="jade" />
                <DashboardStat icon={<ScrollText size={16} />} label="资料" value={36} unit="条" tone="walnut" />
                <DashboardStat icon={<ScrollText size={16} />} label="影像" value={4} unit="份" tone="terracotta" />
              </div>
            </HomePanel>
          </FadeIn>
        </Section>

        {/* ---------- 状态徽标 ---------- */}
        <Section title="6 · 状态徽标">
          <div className="flex flex-wrap gap-2">
            <StatusBadge variant="success">已认领</StatusBadge>
            <StatusBadge variant="warning">待认领</StatusBadge>
            <StatusBadge variant="muted">家人</StatusBadge>
          </div>
        </Section>

        {/* ---------- 空态插画 ---------- */}
        <Section title="7 · 暖调空态插画 ×6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { name: 'NoMembers', el: <NoMembersIllustration /> },
              { name: 'NoStories', el: <NoStoriesIllustration /> },
              { name: 'NoPhotos', el: <NoPhotosIllustration /> },
              { name: 'NoCalendar', el: <NoCalendarIllustration /> },
              { name: 'NoMeetings', el: <NoMeetingsIllustration /> },
              { name: 'NoActivity', el: <NoActivityIllustration /> },
            ].map(({ name, el }) => (
              <figure
                key={name}
                className="flex flex-col items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-1)] bg-[var(--surface-1)] p-4"
              >
                {el}
                <figcaption className="text-[12px] text-[var(--ink-3)]">{name}</figcaption>
              </figure>
            ))}
          </div>
        </Section>

        {/* ---------- EmptyState ---------- */}
        <Section title="8 · EmptyState（接入插画）">
          <div className="rounded-[var(--radius-md)] border border-[var(--line-1)] bg-[var(--surface-1)]">
            <EmptyState
              illustration={<NoStoriesIllustration />}
              title="还没有家族故事"
              description="从一段回忆、一件小事开始，沉淀家族记忆"
            />
          </div>
        </Section>

        {/* ---------- 骨架屏 ---------- */}
        <Section title="9 · 骨架屏原子">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Skeleton.Box height={56} radius="sm" />
              <Skeleton.Box height={56} radius="sm" />
              <Skeleton.Box height={56} radius="sm" />
            </div>
            <Skeleton.Card />
            <Skeleton.Card />
          </div>
        </Section>

        <footer className="pt-8 text-center text-[12px] text-[var(--ink-3)]">
          仅在开发环境可见 · 修改 globals.css 后会自动反映
        </footer>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 font-serif text-[22px] font-bold text-[var(--ink-1)]">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ name, varName, textOn }: { name: string; varName: string; textOn: 'ink-1' | 'surface-1' }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--line-1)]">
      <div
        className="flex h-20 items-end p-3"
        style={{
          backgroundColor: `var(${varName})`,
          color: textOn === 'ink-1' ? 'var(--ink-1)' : 'var(--surface-1)',
        }}
      >
        <span className="text-[13px] font-semibold">{name}</span>
      </div>
      <div className="bg-[var(--surface-1)] px-3 py-2 text-[11px] text-[var(--ink-3)]">{varName}</div>
    </div>
  );
}
