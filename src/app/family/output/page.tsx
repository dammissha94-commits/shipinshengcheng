'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { canCreateFamilyOutput, isFamilyMember } from '@/lib/auth/permission-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import {
  createFamilyOutput,
  generateFamilyMemoryBookPreview,
  generateFamilyStoryBookPreview,
  generateFamilyYearbookPreview,
  generateThreeGenerationTreePreview,
  listFamilyOutputs,
} from '@/lib/services/output-service';
import type { FamilyOutput, FamilyOutputType, Visibility } from '@/types/domain';
import type {
  FamilyMemoryBookPreview,
  FamilyOutputPreviewData,
  FamilyStoryBookPreview,
  FamilyYearbookPreview,
  ThreeGenerationTreePreview,
} from '@/types/service';
import type { FamilySpace } from '@/types/domain';
import AppHeader from '@/components/AppHeader';
import EmptyState from '@/components/EmptyState';
import SectionTitle from '@/components/SectionTitle';

const SUPABASE_FALLBACK_MESSAGE = '尚未配置 Supabase 环境变量，请先配置 .env.local';

const OUTPUT_TYPE_LABELS: Record<FamilyOutputType, string> = {
  three_generation_tree: '三代谱',
  family_memory_book: '家族记忆册',
  family_story_book: '家族故事册',
  family_yearbook: '家族年鉴',
};

const STATUS_LABELS: Record<FamilyOutput['status'], string> = {
  draft: '草稿',
  preview_ready: '预览已生成',
  archived: '已归档',
};

const VISIBILITY_LABELS: Record<Visibility, string> = {
  private: '仅自己可见',
  family: '家庭内可见',
  public: '公开可见',
};

const PRODUCT_DESCRIPTIONS: Record<FamilyOutputType, string> = {
  three_generation_tree: '根据已录入的家人关系自动生成，可用于家庭保存和分享。',
  family_memory_book: '把家人故事、老照片和重要纪念日整理成册。',
  family_story_book: '把家族故事和人物回忆整理为可长期保存的家史资料。',
  family_yearbook: '按年度整理家族成员、故事、相册和家庭事项。',
};

const PRODUCT_TYPES: FamilyOutputType[] = [
  'three_generation_tree',
  'family_memory_book',
  'family_story_book',
  'family_yearbook',
];

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function productTitle(family: FamilySpace, type: FamilyOutputType): string {
  const prefix = `${family.surname}家`;
  if (type === 'three_generation_tree') return `${prefix}三代谱`;
  if (type === 'family_memory_book') return `${prefix}记忆册`;
  if (type === 'family_story_book') return `${prefix}故事册`;
  return `${prefix}年鉴`;
}

function sanitizeError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  if (message.includes('Auth session missing')) return '请先登录';
  if (message.includes('failed') || message.includes('violates') || message.includes('permission denied')) {
    return fallback;
  }
  return message;
}

function isTreePreview(value: unknown): value is ThreeGenerationTreePreview {
  if (!value || typeof value !== 'object') return false;
  const preview = value as Record<string, unknown>;
  return typeof preview.familyName === 'string' && typeof preview.totalPersons === 'number' && Boolean(preview.generations);
}

function isMemoryPreview(value: unknown): value is FamilyMemoryBookPreview {
  if (!value || typeof value !== 'object') return false;
  const preview = value as Record<string, unknown>;
  return typeof preview.storyCount === 'number' && typeof preview.photoCount === 'number';
}

function isStoryPreview(value: unknown): value is FamilyStoryBookPreview {
  if (!value || typeof value !== 'object') return false;
  const preview = value as Record<string, unknown>;
  return typeof preview.storyCount === 'number' && Array.isArray(preview.storyTitles);
}

function isYearbookPreview(value: unknown): value is FamilyYearbookPreview {
  if (!value || typeof value !== 'object') return false;
  const preview = value as Record<string, unknown>;
  return typeof preview.year === 'number' && typeof preview.personCount === 'number';
}

export default function OutputPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [outputs, setOutputs] = useState<FamilyOutput[]>([]);
  const [canGenerate, setCanGenerate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingType, setSubmittingType] = useState<FamilyOutputType | null>(null);
  const [error, setError] = useState('');

  async function reload(currentFamily: FamilySpace) {
    const records = await listFamilyOutputs(currentFamily.id);
    setOutputs(records);
  }

  useEffect(() => {
    async function load() {
      if (!hasSupabaseConfig()) {
        setError(SUPABASE_FALLBACK_MESSAGE);
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

        const member = await isFamilyMember(currentFamily.id);
        if (!member) {
          setError('你暂无权限执行此操作');
          setLoading(false);
          return;
        }

        const [records, allowed] = await Promise.all([
          listFamilyOutputs(currentFamily.id),
          canCreateFamilyOutput(currentFamily.id),
        ]);
        setFamily(currentFamily);
        setOutputs(records);
        setCanGenerate(allowed);
      } catch (loadError) {
        setError(sanitizeError(loadError, '加载成果物失败'));
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
      await reload(family);
    } catch (submitError) {
      setError(sanitizeError(submitError, '生成成果物预览失败'));
    } finally {
      setSubmittingType(null);
    }
  }

  if (loading) return <CenteredText text="加载中..." />;

  if (!hasSupabaseConfig()) {
    return <Shell><CenteredPanel text={SUPABASE_FALLBACK_MESSAGE} /></Shell>;
  }

  if (error && !family) {
    return <Shell><CenteredPanel text={error} /></Shell>;
  }

  return (
    <Shell>
      <main className="mx-auto max-w-md px-4 py-6">
        <div className="mb-5 rounded-2xl bg-pine p-5 text-cream">
          <p className="mb-1 text-xs tracking-wider text-cream/60">成果物中心</p>
          <h1 className="text-xl font-bold">{family?.displayName}</h1>
          <p className="mt-1 text-sm text-cream/70">
            {outputs.length} 条预览记录 · 将家族关系和家族记忆整理为长期资料
          </p>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <section className="mb-7">
          <SectionTitle title="生成预览" subtitle="本阶段只保存结构化预览记录，不生成真实文件" />
          <div className="grid gap-3">
            {PRODUCT_TYPES.map((type) => (
              <ProductCard
                key={type}
                type={type}
                title={family ? productTitle(family, type) : OUTPUT_TYPE_LABELS[type]}
                description={PRODUCT_DESCRIPTIONS[type]}
                disabled={!canGenerate || submittingType !== null}
                submitting={submittingType === type}
                onGenerate={() => generatePreview(type)}
              />
            ))}
          </div>
          {!canGenerate && (
            <p className="mt-3 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-muted">
              普通成员可查看已有成果物，生成预览需要家堂管理权限。
            </p>
          )}
        </section>

        <section>
          <SectionTitle title="成果物记录" subtitle="家庭内保存的预览版本" />
          {outputs.length === 0 ? (
            <EmptyState
              icon={<FileIcon />}
              title="还没有成果物记录"
              description="生成一次预览后，这里会显示标题、状态、说明和预览摘要。"
            />
          ) : (
            <div className="space-y-3">
              {outputs.map((output) => (
                <OutputCard key={output.id} output={output} />
              ))}
            </div>
          )}
        </section>
      </main>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <AppHeader title="成果物" backHref="/family" />
      {children}
    </div>
  );
}

function CenteredText({ text }: { text: string }) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 text-center">
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}

function CenteredPanel({ text }: { text: string }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-4 text-center">
      <p className="rounded-2xl border border-sand/70 bg-card px-4 py-5 text-sm text-muted shadow-sm">{text}</p>
    </main>
  );
}

function ProductCard({
  type,
  title,
  description,
  disabled,
  submitting,
  onGenerate,
}: {
  type: FamilyOutputType;
  title: string;
  description: string;
  disabled: boolean;
  submitting: boolean;
  onGenerate: () => void;
}) {
  return (
    <article className="rounded-2xl border border-sand/70 bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pine/10 text-pine">
          <FileIcon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-charcoal">{title}</h3>
            <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold">
              {OUTPUT_TYPE_LABELS[type]}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onGenerate}
        disabled={disabled}
        className="w-full rounded-xl bg-pine py-3 text-sm font-semibold text-cream transition-colors hover:bg-pine-light disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? '生成中...' : '生成预览'}
      </button>
    </article>
  );
}

function OutputCard({ output }: { output: FamilyOutput }) {
  const preview = output.preview_data ?? {};

  return (
    <article className="rounded-2xl border border-sand/70 bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug text-charcoal">{output.title}</h3>
          <p className="mt-1 text-xs text-muted">
            {OUTPUT_TYPE_LABELS[output.output_type]} · {VISIBILITY_LABELS[output.visibility]} · {formatDate(output.created_at)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-pine/10 px-2.5 py-1 text-xs font-medium text-pine">
          {STATUS_LABELS[output.status]}
        </span>
      </div>
      {output.description && <p className="mb-3 text-sm leading-relaxed text-muted">{output.description}</p>}
      <PreviewSummary type={output.output_type} preview={preview} />
    </article>
  );
}

function PreviewSummary({
  type,
  preview,
}: {
  type: FamilyOutputType;
  preview: Record<string, unknown>;
}) {
  if (type === 'three_generation_tree' && isTreePreview(preview)) {
    return <ThreeGenerationPreview preview={preview} />;
  }

  if (type === 'family_memory_book' && isMemoryPreview(preview)) {
    return (
      <SummaryGrid
        items={[
          ['故事', `${preview.storyCount} 条`],
          ['相册', `${preview.photoCount} 条`],
        ]}
      />
    );
  }

  if (type === 'family_story_book' && isStoryPreview(preview)) {
    return (
      <div className="rounded-xl bg-sand/40 p-3">
        <p className="text-xs text-muted">共 {preview.storyCount} 条故事</p>
        <p className="mt-1 line-clamp-2 text-sm text-charcoal">
          {preview.storyTitles.length > 0 ? preview.storyTitles.join('、') : '暂无故事条目'}
        </p>
      </div>
    );
  }

  if (type === 'family_yearbook' && isYearbookPreview(preview)) {
    return (
      <SummaryGrid
        items={[
          ['年度', `${preview.year}`],
          ['成员', `${preview.personCount} 位`],
          ['故事', `${preview.storyCount} 条`],
          ['相册', `${preview.photoCount} 条`],
        ]}
      />
    );
  }

  return <p className="rounded-xl bg-sand/40 px-3 py-2 text-xs text-muted">暂无预览摘要</p>;
}

function ThreeGenerationPreview({ preview }: { preview: ThreeGenerationTreePreview }) {
  return (
    <div className="space-y-3">
      <SummaryGrid
        items={[
          ['家堂', preview.familyName],
          ['姓氏', preview.surname],
          ['已录入', `${preview.totalPersons} 人`],
          ['已认领', `${preview.claimedPersons} 人`],
          ['待认领', `${preview.unclaimedPersons} 人`],
          ['在世', `${preview.alivePersons} 人`],
          ['已故', `${preview.deceasedPersons} 人`],
          ['关系', `${preview.relationCount} 条`],
        ]}
      />
      <GenerationRow label="祖辈" people={preview.generations.grandparents} />
      <GenerationRow label="父母" people={preview.generations.parents} />
      <GenerationRow label="本人 / 配偶 / 兄弟姐妹" people={preview.generations.selfAndSiblings} />
      <GenerationRow label="子女" people={preview.generations.children} />
    </div>
  );
}

function SummaryGrid({ items }: { items: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-sand/40 px-3 py-2">
          <p className="text-[11px] text-muted">{label}</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-charcoal">{value}</p>
        </div>
      ))}
    </div>
  );
}

function GenerationRow({ label, people }: { label: string; people: { id: string; name: string }[] }) {
  return (
    <div className="rounded-xl border border-sand/70 bg-cream/60 p-3">
      <p className="mb-2 text-xs font-semibold text-muted">{label}</p>
      {people.length === 0 ? (
        <p className="text-xs text-muted/70">暂未录入</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {people.map((person) => (
            <span key={person.id} className="rounded-full bg-pine/10 px-2.5 py-1 text-xs font-medium text-pine">
              {person.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}
