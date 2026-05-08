'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CalendarDays, FileText, Sparkles, Trees } from 'lucide-react';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { MobilePage, MobileStatusBar, MobileTopBar } from '@/components/wujia/MobileChrome';
import {
  WjCardHeader,
  WjHeroPanel,
  WjPaperCard,
  WjScreenContent,
  WjSoftNote,
} from '@/components/wujia/MobileDesignSystem';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import {
  createFamilyOutput,
  generateFamilyMemoryBookPreview,
  generateFamilyStoryBookPreview,
  generateFamilyYearbookPreview,
  generateThreeGenerationTreePreview,
  canCreateFamilyOutputForCurrentUser,
} from '@/lib/services/output-service';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import type { FamilyOutputType, FamilySpace } from '@/types/domain';
import type { FamilyOutputPreviewData } from '@/types/service';

const PRODUCT_TYPES: FamilyOutputType[] = [
  'three_generation_tree',
  'family_memory_book',
  'family_story_book',
  'family_yearbook',
];

const OUTPUT_TYPE_LABELS: Record<FamilyOutputType, string> = {
  three_generation_tree: '三代谱档案',
  family_memory_book: '家族记忆册',
  family_story_book: '家族故事册',
  family_yearbook: '家族年鉴',
};

const PRODUCT_DESCRIPTIONS: Record<FamilyOutputType, string> = {
  three_generation_tree: '根据已录入的家人关系整理三代谱档案。',
  family_memory_book: '把家人故事、照片和家庭节点整理成可长期保存的档案。',
  family_story_book: '把家族故事和人物回忆整理成可阅读的故事档案。',
  family_yearbook: '按年度整理家族成员、故事和家庭事项。',
};

const PRODUCT_HINTS: Record<FamilyOutputType, string> = {
  three_generation_tree: '适合先核对家族关系与三代谱结构。',
  family_memory_book: '适合把照片、故事和家庭节点集中预览。',
  family_story_book: '适合给长辈或孩子阅读家庭故事。',
  family_yearbook: '适合每年整理一次家庭共同记忆。',
};

function submittingMessage(type: FamilyOutputType | null): string {
  if (!type) return '';
  return `正在整理${OUTPUT_TYPE_LABELS[type]}，会读取相关家人、故事或照片数据，请不要关闭页面。`;
}

function productTitle(family: FamilySpace, type: FamilyOutputType): string {
  const prefix = `${family.surname}氏`;
  if (type === 'three_generation_tree') return `${prefix}三代谱档案`;
  if (type === 'family_memory_book') return `${prefix}家族记忆册`;
  if (type === 'family_story_book') return `${prefix}家族故事册`;
  return `${prefix}家族年鉴`;
}

function familyDisplayName(family: FamilySpace | null): string {
  if (!family) return '整理档案';
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

export default function NewOutputPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [canGenerate, setCanGenerate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingType, setSubmittingType] = useState<FamilyOutputType | null>(null);
  const [error, setError] = useState('');

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

        const canCreate = await canCreateFamilyOutputForCurrentUser(currentFamily.id);
        setFamily(currentFamily);
        setCanGenerate(canCreate);
      } catch (loadError) {
        setError(sanitizeError(loadError, '加载整理档案页面失败，请检查网络或权限'));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  async function generatePreview(type: FamilyOutputType) {
    if (!family) return;
    if (!canGenerate) {
      setError('你暂无权限执行此操作');
      return;
    }

    try {
      setSubmittingType(type);
      setError('');

      let previewData: FamilyOutputPreviewData;
      if (type === 'three_generation_tree') {
        previewData = await generateThreeGenerationTreePreview(family.id);
      } else if (type === 'family_memory_book') {
        previewData = await generateFamilyMemoryBookPreview(family.id);
      } else if (type === 'family_story_book') {
        previewData = await generateFamilyStoryBookPreview(family.id);
      } else {
        previewData = await generateFamilyYearbookPreview(family.id);
      }

      await createFamilyOutput({
        familyId: family.id,
        outputType: type,
        title: productTitle(family, type),
        description: PRODUCT_DESCRIPTIONS[type],
        status: 'preview_ready',
        previewData,
        visibility: 'family',
      });

      router.push('/family/output');
    } catch (submitError) {
      setError(sanitizeError(submitError, '生成档案预览失败，请检查网络或权限'));
    } finally {
      setSubmittingType(null);
    }
  }

  if (loading) {
    return <PageSkeleton title="整理档案" backHref="/family/output" cards={4} withStats={false} withSearch={false} />;
  }

  if (error && !family) {
    return (
      <NewOutputShell>
        <CenteredMessage text={error} />
      </NewOutputShell>
    );
  }

  return (
    <NewOutputShell>
      <WjScreenContent>
        <WjHeroPanel
          eyebrow="整理档案"
          title={familyDisplayName(family)}
          description="选择一种档案类型，系统会先生成预览记录。主页面只保留档案入口和历史记录，阅读起来更轻。"
        >
          <WjSoftNote>这一步只是整理预览，不会修改家人、关系、故事或相册原始数据。</WjSoftNote>
        </WjHeroPanel>

        {error && <p className="rounded-xl bg-danger-light px-4 py-2.5 text-sm text-danger">{error}</p>}
        {submittingType && <WjSoftNote>{submittingMessage(submittingType)}</WjSoftNote>}

        <WjPaperCard>
          <WjCardHeader title="选择档案类型" description="建议先从三代谱档案开始，便于检查关系是否完整。" />
          <div className="space-y-3 p-4">
            {PRODUCT_TYPES.map((type) => (
              <ProductCard
                key={type}
                type={type}
                title={family ? productTitle(family, type) : OUTPUT_TYPE_LABELS[type]}
                label={OUTPUT_TYPE_LABELS[type]}
                description={PRODUCT_DESCRIPTIONS[type]}
                hint={PRODUCT_HINTS[type]}
                disabled={!canGenerate || submittingType !== null}
                loading={submittingType === type}
                onClick={() => generatePreview(type)}
              />
            ))}
          </div>
          {!canGenerate && (
            <div className="border-t border-[#EEE3D6] px-5 py-3">
              <p className="text-[12px] leading-5 text-[#78675B]">
                普通成员可查看已有档案，整理新的档案预览需要家堂管理权限。
              </p>
            </div>
          )}
        </WjPaperCard>
      </WjScreenContent>
    </NewOutputShell>
  );
}

function NewOutputShell({ children }: { children: React.ReactNode }) {
  return (
    <MobilePage>
      <MobileStatusBar />
      <MobileTopBar title="整理档案" backHref="/family/output" />
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

function ProductCard({
  type,
  title,
  label,
  description,
  hint,
  disabled,
  loading,
  onClick,
}: {
  type: FamilyOutputType;
  title: string;
  label: string;
  description: string;
  hint: string;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <article className="rounded-[16px] border border-[#E7D9C9] bg-white/88 p-4 shadow-[0_8px_20px_rgba(90,53,36,0.05)]">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[#F4E8DC] text-[#8B5A3C]">
          <ProductIcon type={type} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold text-[#2A1D16]">{title}</h3>
            <span className="rounded-full bg-[#FBF7EF] px-2 py-0.5 text-[11px] font-medium text-[#8A7465]">
              {label}
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-5 text-[#78675B]">{description}</p>
        </div>
      </div>
      <div className="mb-3 flex items-center gap-2 rounded-[13px] bg-[#FBF7EF] px-3 py-2 text-[12px] text-[#78675B]">
        <Sparkles size={14} className="shrink-0 text-[#B8924E]" />
        <span>{hint}</span>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="wj-primary min-h-[44px] w-full rounded-xl text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? '整理中...' : '整理档案预览'}
      </button>
    </article>
  );
}

function ProductIcon({ type }: { type: FamilyOutputType }) {
  if (type === 'three_generation_tree') return <Trees size={20} />;
  if (type === 'family_memory_book') return <FileText size={20} />;
  if (type === 'family_story_book') return <BookOpen size={20} />;
  return <CalendarDays size={20} />;
}
