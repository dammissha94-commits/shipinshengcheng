'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { createFamilyOutput, generateFamilyMemoryBookPreview, generateFamilyStoryBookPreview, generateFamilyYearbookPreview, generateThreeGenerationTreePreview, getOutputPageViewData, listFamilyOutputs } from '@/lib/services/output-service';
import type { FamilyOutput, FamilyOutputType, Visibility } from '@/types/domain';
import type { FamilyMemoryBookPreview, FamilyOutputPreviewData, FamilyStoryBookPreview, FamilyYearbookPreview, ThreeGenerationTreePreview } from '@/types/service';
import type { FamilySpace } from '@/types/domain';
import AppHeader from '@/components/AppHeader';
import EmptyState from '@/components/wujia/EmptyState';
import SectionCard from '@/components/wujia/SectionCard';

const OUTPUT_TYPE_LABELS: Record<FamilyOutputType, string> = { three_generation_tree: '三代谱', family_memory_book: '家族记忆册', family_story_book: '家族故事册', family_yearbook: '家族年鉴' };
const STATUS_LABELS: Record<FamilyOutput['status'], string> = { draft: '草稿', preview_ready: '预览已生成', archived: '已归档' };
const VISIBILITY_LABELS: Record<Visibility, string> = { private: '仅自己可见', family: '家庭内可见', public: '公开可见' };
const PRODUCT_DESCRIPTIONS: Record<FamilyOutputType, string> = {
  three_generation_tree: '根据已录入的家人关系自动生成', family_memory_book: '把家人故事、照片和纪念日整理成册',
  family_story_book: '把家族故事和人物回忆整理为可长期保存的资料', family_yearbook: '按年度整理家族成员、故事和家庭事项',
};
const PRODUCT_TYPES: FamilyOutputType[] = ['three_generation_tree', 'family_memory_book', 'family_story_book', 'family_yearbook'];

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}
function productTitle(family: FamilySpace, type: FamilyOutputType): string {
  const prefix = `${family.surname}家`;
  if (type === 'three_generation_tree') return `${prefix}三代谱`;
  if (type === 'family_memory_book') return `${prefix}记忆册`;
  if (type === 'family_story_book') return `${prefix}故事册`;
  return `${prefix}年鉴`;
}
function sanitizeError(error: unknown, fallback: string): string {
  const msg = error instanceof Error ? error.message : fallback;
  if (msg.includes('Auth session missing')) return '请先登录';
  if (msg.includes('failed') || msg.includes('violates') || msg.includes('permission denied')) return fallback;
  return msg;
}
function isTreePreview(v: unknown): v is ThreeGenerationTreePreview { return !!v && typeof v === 'object' && typeof (v as Record<string,unknown>).familyName === 'string' && typeof (v as Record<string,unknown>).totalPersons === 'number'; }
function isMemoryPreview(v: unknown): v is FamilyMemoryBookPreview { return !!v && typeof v === 'object' && typeof (v as Record<string,unknown>).storyCount === 'number'; }
function isStoryPreview(v: unknown): v is FamilyStoryBookPreview { return !!v && typeof v === 'object' && typeof (v as Record<string,unknown>).storyCount === 'number'; }
function isYearbookPreview(v: unknown): v is FamilyYearbookPreview { return !!v && typeof v === 'object' && typeof (v as Record<string,unknown>).year === 'number'; }

export default function OutputPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [outputs, setOutputs] = useState<FamilyOutput[]>([]);
  const [canGenerate, setCanGenerate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingType, setSubmittingType] = useState<FamilyOutputType | null>(null);
  const [error, setError] = useState('');

  async function reload(currentFamily: FamilySpace) { setOutputs(await listFamilyOutputs(currentFamily.id)); }

  useEffect(() => {
    async function load() {
      if (!hasSupabaseConfig()) { setError('尚未配置 Supabase 环境变量，请先配置 .env.local'); setLoading(false); return; }
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) { router.replace('/create'); return; }
        const { outputs: records, canCreate: allowed } = await getOutputPageViewData(currentFamily.id);
        setFamily(currentFamily); setOutputs(records); setCanGenerate(allowed);
      } catch (e) { setError(sanitizeError(e, '加载成果物失败')); }
      finally { setLoading(false); }
    }
    load();
  }, [router]);

  async function generatePreview(type: FamilyOutputType) {
    if (!family) return;
    if (!canGenerate) { setError('你暂无权限执行此操作'); return; }
    try {
      setSubmittingType(type); setError('');
      let previewData: FamilyOutputPreviewData;
      if (type === 'three_generation_tree') previewData = await generateThreeGenerationTreePreview(family.id);
      else if (type === 'family_memory_book') previewData = await generateFamilyMemoryBookPreview(family.id);
      else if (type === 'family_story_book') previewData = await generateFamilyStoryBookPreview(family.id);
      else previewData = await generateFamilyYearbookPreview(family.id);
      await createFamilyOutput({ familyId: family.id, outputType: type, title: productTitle(family, type), description: PRODUCT_DESCRIPTIONS[type], status: 'preview_ready', previewData, visibility: 'family' });
      await reload(family);
    } catch (e) { setError(sanitizeError(e, '生成成果物预览失败')); }
    finally { setSubmittingType(null); }
  }

  if (loading) return <C text="加载中..." />;
  if (!hasSupabaseConfig()) return <S><P text="尚未配置 Supabase 环境变量，请先配置 .env.local" /></S>;
  if (error && !family) return <S><P text={error} /></S>;

  return (
    <S>
      <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <div className="rounded-2xl bg-#5A3524 p-5 text-white">
          <p className="text-xs text-white/40 tracking-widest font-medium">成果物中心</p>
          <h1 className="mt-0.5 text-xl font-bold">{family?.displayName}</h1>
          <p className="mt-1 text-sm text-white/55">{outputs.length} 条预览记录 · 将家族关系和记忆整理为长期资料</p>
        </div>

        {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}

        {/* Generate section */}
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 px-5 py-4">
            <h2 className="text-base font-semibold text-stone-800">生成预览</h2>
            <p className="mt-0.5 text-sm text-stone-500">保存结构化预览记录</p>
          </div>
          <div className="p-5 space-y-3">
            {PRODUCT_TYPES.map((type) => (
              <div key={type} className="rounded-xl border border-stone-200 bg-[#F8F1E7] p-4">
                <div className="mb-3 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-#F0E6D5 text-#8D6E63">
                    <FileIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-stone-800">{family ? productTitle(family, type) : OUTPUT_TYPE_LABELS[type]}</h3>
                      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-medium text-stone-500">{OUTPUT_TYPE_LABELS[type]}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-stone-500">{PRODUCT_DESCRIPTIONS[type]}</p>
                  </div>
                </div>
                <button type="button" onClick={() => generatePreview(type)}
                  disabled={!canGenerate || submittingType !== null}
                  className="w-full rounded-xl bg-#5A3524 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-#4E342E disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]">
                  {submittingType === type ? '生成中...' : '生成预览'}
                </button>
              </div>
            ))}
          </div>
          {!canGenerate && (
            <div className="border-t border-stone-100 px-5 py-3">
              <p className="text-xs text-stone-400">普通成员可查看已有成果物，生成预览需要家堂管理权限。</p>
            </div>
          )}
        </div>

        {/* Records section */}
        {outputs.length === 0 ? (
          <EmptyState
            icon={<FileText size={24} strokeWidth={1.8} />}
            title="还没有成果物记录"
            description="生成一次预览后，这里会显示标题、状态和预览摘要"
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-4 w-[3px] rounded-full bg-amber-500/60" />
              <h2 className="text-base font-semibold text-stone-800">成果物记录</h2>
            </div>
            {outputs.map((output) => (
              <div key={output.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-stone-800">{output.title}</h3>
                    <p className="mt-1 text-xs text-stone-500">{OUTPUT_TYPE_LABELS[output.output_type]} · {VISIBILITY_LABELS[output.visibility]} · {formatDate(output.created_at)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-#F0E6D5 px-2.5 py-0.5 text-[11px] font-medium text-#8D6E63">{STATUS_LABELS[output.status]}</span>
                </div>
                {output.description && <p className="mb-3 text-sm text-stone-500">{output.description}</p>}
                <PreviewSummary type={output.output_type} preview={output.preview_data ?? {}} />
              </div>
            ))}
          </div>
        )}
      </main>
    </S>
  );
}

function S({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#F8F1E7]"><AppHeader title="成果物" backHref="/family" />{children}</div>;
}
function C({ text }: { text: string }) {
  return <div className="min-h-screen bg-[#F8F1E7] flex items-center justify-center"><p className="text-sm text-stone-500">{text}</p></div>;
}
function P({ text }: { text: string }) {
  return <main className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 text-center"><p className="rounded-2xl border border-stone-200 bg-white px-4 py-5 text-sm text-stone-500 shadow-sm">{text}</p></main>;
}

function PreviewSummary({ type, preview }: { type: FamilyOutputType; preview: Record<string, unknown> }) {
  if (type === 'three_generation_tree' && isTreePreview(preview)) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          {[['家堂',preview.familyName],['姓氏',preview.surname],['已录入',`${preview.totalPersons} 人`],['已认领',`${preview.claimedPersons} 人`],['待认领',`${preview.unclaimedPersons} 人`],['在世',`${preview.alivePersons} 人`],['已故',`${preview.deceasedPersons} 人`],['关系',`${preview.relationCount} 条`]].map(([l,v]) => (
            <div key={l as string} className="rounded-lg bg-[#F8F1E7] px-3 py-1.5 flex justify-between"><span className="text-[11px] text-stone-400">{l as string}</span><span className="text-[11px] font-medium text-stone-700">{v as string}</span></div>
          ))}
        </div>
        {(['grandparents','parents','selfAndSiblings','children'] as const).map((key) => {
          const names: Record<string,string> = { grandparents:'祖辈', parents:'父母', selfAndSiblings:'本人/配偶/兄弟姐妹', children:'子女' };
          const people = preview.generations[key] as { id:string; name:string }[];
          return (
            <div key={key} className="rounded-lg border border-stone-100 bg-[#F8F1E7] p-2.5">
              <p className="text-[11px] font-medium text-stone-400 mb-1.5">{names[key]}</p>
              {people.length === 0 ? <p className="text-[11px] text-stone-300">暂未录入</p>
                : <div className="flex flex-wrap gap-1.5">{people.map((p) => <span key={p.id} className="rounded-full bg-#F0E6D5 px-2 py-0.5 text-[11px] font-medium text-#8D6E63">{p.name}</span>)}</div>}
            </div>
          );
        })}
      </div>
    );
  }
  if (type === 'family_memory_book' && isMemoryPreview(preview)) {
    return <div className="grid grid-cols-2 gap-1.5">{[['故事',`${preview.storyCount} 条`],['相册',`${preview.photoCount} 条`]].map(([l,v]) => <div key={l} className="rounded-lg bg-[#F8F1E7] px-3 py-1.5 flex justify-between"><span className="text-[11px] text-stone-400">{l}</span><span className="text-[11px] font-medium text-stone-700">{v}</span></div>)}</div>;
  }
  if (type === 'family_story_book' && isStoryPreview(preview)) {
    return <div className="rounded-lg bg-[#F8F1E7] p-3"><p className="text-xs text-stone-500">共 {preview.storyCount} 条故事</p><p className="mt-1 line-clamp-2 text-sm text-stone-700">{preview.storyTitles.length > 0 ? preview.storyTitles.join('、') : '暂无故事条目'}</p></div>;
  }
  if (type === 'family_yearbook' && isYearbookPreview(preview)) {
    return <div className="grid grid-cols-2 gap-1.5">{[['年度',`${preview.year}`],['成员',`${preview.personCount} 位`],['故事',`${preview.storyCount} 条`],['相册',`${preview.photoCount} 条`]].map(([l,v]) => <div key={l} className="rounded-lg bg-[#F8F1E7] px-3 py-1.5 flex justify-between"><span className="text-[11px] text-stone-400">{l}</span><span className="text-[11px] font-medium text-stone-700">{v}</span></div>)}</div>;
  }
  return <p className="text-xs text-stone-400">暂无预览摘要</p>;
}

function FileIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
}
