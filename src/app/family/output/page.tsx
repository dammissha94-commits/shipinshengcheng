'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Archive, ChevronRight, PlusCircle, Printer } from 'lucide-react';
import EmptyState from '@/components/wujia/EmptyState';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { NoStoriesIllustration } from '@/components/illustrations';
import { MobilePage, MobileStatusBar, MobileTopBar } from '@/components/wujia/MobileChrome';
import {
  WjCardHeader,
  WjHeroPanel,
  WjInlineStat,
  WjPaperCard,
  WjScreenContent,
  WjSoftNote,
} from '@/components/wujia/MobileDesignSystem';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { getOutputPageViewData, type FamilyOutputListItem } from '@/lib/services/output-service';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import type { FamilyOutput, FamilyOutputType, FamilySpace, Visibility } from '@/types/domain';

const OUTPUT_TYPE_LABELS: Record<FamilyOutputType, string> = {
  three_generation_tree: '三代谱档案',
  family_memory_book: '家族记忆册',
  family_story_book: '家族故事册',
  family_yearbook: '家族年鉴',
};

const STATUS_LABELS: Record<FamilyOutput['status'], string> = {
  draft: '草稿',
  preview_ready: '已生成预览',
  archived: '已归档',
};

const VISIBILITY_LABELS: Record<Visibility, string> = {
  private: '仅自己可见',
  family: '家人可见',
  public: '公开可见',
};

const INITIAL_VISIBLE_OUTPUTS = 8;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function familyDisplayName(family: FamilySpace | null): string {
  if (!family) return '家堂档案';
  return family.displayName || family.display_name || `${family.surname}氏家堂`;
}

function sanitizeError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  if (message.includes('Auth session missing')) return '请先登录';
  if (
    message.includes('failed') ||
    message.includes('violates') ||
    message.includes('permission denied') ||
    message.includes('Supabase')
  ) {
    return fallback;
  }
  return message;
}

export default function OutputPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [outputs, setOutputs] = useState<FamilyOutputListItem[]>([]);
  const [canGenerate, setCanGenerate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_OUTPUTS);

  useEffect(() => {
    async function load() {
      if (!hasSupabaseConfig()) {
        setError('尚未配置 Supabase 环境变量，请先配置 .env.local');
        setLoading(false);
        return;
      }

      try {
        const user = await getCurrentUser();
        if (!user) {
          router.replace(currentLoginRedirectPath());
          return;
        }

        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) {
          router.replace('/create');
          return;
        }

        const { outputs: records, canCreate } = await getOutputPageViewData(currentFamily.id);
        setFamily(currentFamily);
        setOutputs(records);
        setCanGenerate(canCreate);
        setVisibleCount(INITIAL_VISIBLE_OUTPUTS);
      } catch (loadError) {
        setError(sanitizeError(loadError, '加载家堂档案失败，请检查网络或权限'));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  if (loading) {
    return <PageSkeleton title="家堂档案" backHref="/family" cards={3} withStats={false} withSearch={false} />;
  }

  if (error && !family) {
    return (
      <OutputShell>
        <CenteredMessage text={error} />
      </OutputShell>
    );
  }

  return (
    <OutputShell>
      <WjScreenContent>
        <WjHeroPanel
          eyebrow="家堂档案"
          title={familyDisplayName(family)}
          description="这里保留已整理的档案记录。完整预览只在整理或导出时生成，主页面会更轻、更快。"
        >
          <div className="grid grid-cols-2 gap-3">
            <WjInlineStat label="档案记录" value={outputs.length} />
            <WjInlineStat label="整理权限" value={canGenerate ? '可整理' : '仅查看'} />
          </div>
        </WjHeroPanel>

        <WjPaperCard className="p-4">
          <div className="space-y-3">
            {canGenerate ? (
              <Link
                href="/family/output/new"
                className="flex min-h-[64px] items-center gap-3 rounded-[16px] bg-gradient-to-br from-[#B85B38] to-[#8B4A2D] p-4 text-white shadow-[0_12px_26px_rgba(176,84,44,0.22)] transition active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/18">
                  <PlusCircle size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold">整理新的档案</span>
                  <span className="mt-0.5 block text-[12px] text-white/76">选择类型后生成一份档案预览</span>
                </span>
                <ChevronRight size={18} />
              </Link>
            ) : (
              <WjSoftNote>普通成员可查看已有档案，整理新的档案预览需要家堂管理权限。</WjSoftNote>
            )}

            <Link
              href="/family/output/print"
              className="flex min-h-[64px] items-center gap-3 rounded-[16px] border border-[#E7D9C9] bg-[#FBF7EF] p-4 transition active:scale-[0.99]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4E8DC] text-[#8B5A3C]">
                <Printer size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-[#2A1D16]">导出家堂档案</span>
                <span className="mt-0.5 block text-[12px] text-[#8A7465]">打开打印版，可通过浏览器另存为 PDF</span>
              </span>
              <ChevronRight size={17} className="text-[#8A7465]" />
            </Link>
          </div>
        </WjPaperCard>

        {error && family && <p className="rounded-xl bg-danger-light px-4 py-2.5 text-sm text-danger">{error}</p>}

        {outputs.length === 0 ? (
          <EmptyState
            illustration={<NoStoriesIllustration />}
            title="还没有档案记录"
            description="点击“整理新的档案”，先生成一份结构化预览，再决定是否导出保存。"
          />
        ) : (
          <WjPaperCard>
            <WjCardHeader title="档案记录" description={`共 ${outputs.length} 条，优先显示最近整理的档案`} />
            <div className="space-y-3 p-4">
              {outputs.slice(0, visibleCount).map((output) => (
                <article
                  key={output.id}
                  className="rounded-[16px] border border-[#E7D9C9] bg-white/88 p-4 shadow-[0_8px_20px_rgba(90,53,36,0.05)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F4E8DC] text-[#8B5A3C]">
                          <Archive size={16} />
                        </span>
                        <h3 className="line-clamp-1 text-[15px] font-semibold text-[#2A1D16]">{output.title}</h3>
                      </div>
                      <p className="mt-2 text-[12px] text-[#8A7465]">
                        {OUTPUT_TYPE_LABELS[output.output_type]} · {VISIBILITY_LABELS[output.visibility]} ·{' '}
                        {formatDate(output.created_at)}
                      </p>
                      {output.description && (
                        <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-[#78675B]">{output.description}</p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-[#F4E8DC] px-2.5 py-1 text-[11px] font-medium text-[#8B5A3C]">
                      {STATUS_LABELS[output.status]}
                    </span>
                  </div>
                </article>
              ))}
              {visibleCount < outputs.length && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((current) => Math.min(current + INITIAL_VISIBLE_OUTPUTS, outputs.length))}
                  className="flex min-h-[44px] w-full items-center justify-center rounded-[14px] border border-[#E7D9C9] bg-[#FBF7EF] text-[13px] font-semibold text-[#8B5A3C] transition active:scale-[0.99]"
                >
                  查看更多档案
                </button>
              )}
            </div>
          </WjPaperCard>
        )}
      </WjScreenContent>
    </OutputShell>
  );
}

function OutputShell({ children }: { children: React.ReactNode }) {
  return (
    <MobilePage>
      <MobileStatusBar />
      <MobileTopBar title="家堂档案" />
      {children}
    </MobilePage>
  );
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-5 text-center">
      <p className="rounded-[15px] border border-[#E7D9C9] bg-white/82 px-4 py-5 text-sm text-[#8A7465]">
        {text}
      </p>
    </main>
  );
}
