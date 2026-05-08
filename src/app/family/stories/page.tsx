'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, BookOpenText } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { createFamilyStory, listFamilyStories } from '@/lib/services/story-service';
import type { FamilySpace, FamilyStory, Visibility } from '@/types/domain';
import EmptyState from '@/components/wujia/EmptyState';
import FormPanel from '@/components/wujia/FormPanel';
import WjTimeline from '@/components/wujia/WjTimeline';
import { WjFormRow, WjInput, WjSelect, WjTextarea, WjButton } from '@/components/wujia/WjForm';
import { MobilePage, MobileStatusBar, MobileTopBar } from '@/components/wujia/MobileChrome';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { NoStoriesIllustration } from '@/components/illustrations';

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'family', label: '家族可见' }, { value: 'private', label: '仅自己' }, { value: 'public', label: '公开' },
];

function parseRelatedPersonIds(value: string): string[] {
  return value.split(/[,\n，]/).map((s) => s.trim()).filter(Boolean);
}
function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function StoryCard({ story }: { story: FamilyStory }) {
  return (
    <article className="rounded-[13px] border border-[var(--line-1)] bg-white/86 p-3 shadow-warm-xs">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-bold text-[var(--ink-1)]">{story.title}</h3>
          <p className="mt-1 text-[13px] text-[var(--ink-3)]">{story.story_year ? `${story.story_year} 年` : '年份未填'} · {story.author_user_id ? `成员` : '家族成员'}</p>
        </div>
        <button className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--ink-3)]" aria-label="更多">...</button>
      </div>
      <p className="line-clamp-3 text-[14px] leading-6 text-[var(--ink-2)]">{story.content?.trim() || '暂无正文'}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="rounded-md border border-[var(--line-2)] bg-[var(--surface-3)] px-2 py-0.5 text-[12px] text-[var(--jade)]">家族可见</span>
        <span className="text-[12px] text-[var(--ink-placeholder)]">{formatDate(story.created_at)}</span>
      </div>
    </article>
  );
}

export default function StoriesPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [stories, setStories] = useState<FamilyStory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', storyYear: '', content: '', relatedPersonIds: '', visibility: 'family' as Visibility });

  useEffect(() => {
    async function load() {
      if (!hasSupabaseConfig()) { setError('尚未配置 Supabase 环境变量，请先配置 .env.local'); setLoading(false); return; }
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) { router.replace('/create'); return; }
        const records = await listFamilyStories(currentFamily.id);
        setFamily(currentFamily); setStories(records);
      } catch (e) { setError(e instanceof Error ? e.message : '加载家族故事失败'); }
      finally { setLoading(false); }
    }
    load();
  }, [router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!family || !form.title.trim()) return;
    try {
      setSubmitting(true); setError('');
      const story = await createFamilyStory({ familyId: family.id, title: form.title.trim(), storyYear: form.storyYear ? Number(form.storyYear) : null, content: form.content.trim() || null, relatedPersonIds: parseRelatedPersonIds(form.relatedPersonIds), visibility: form.visibility });
      setStories((c) => [story, ...c]);
      setForm({ title: '', storyYear: '', content: '', relatedPersonIds: '', visibility: 'family' }); setShowForm(false);
    } catch (e) { setError(e instanceof Error ? e.message : '保存家族故事失败'); }
    finally { setSubmitting(false); }
  }

  if (loading) return <PageSkeleton title="人生记忆" backHref="/family" cards={4} withStats={false} withSearch={false} />;
  if (!hasSupabaseConfig()) return <S r={null}><P text="尚未配置 Supabase 环境变量，请先配置 .env.local" /></S>;
  if (error && !family) return <S r={null}><P text={error} /></S>;

  return (
    <S r={<button onClick={() => setShowForm((v) => !v)} className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--walnut-light)] hover:bg-[var(--surface-2)]" aria-label="新增故事"><Plus size={18} strokeWidth={2.5} /></button>}>
      <main className="relative z-10 px-5 pb-6">
        {stories.length > 0 && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[13px] text-[var(--ink-3)]">
              共 <span className="font-semibold text-[var(--ink-2)]">{stories.length}</span> 段家族故事
            </p>
            <Link
              href="/family/stories/read"
              className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-[var(--walnut)] to-[var(--walnut-light)] px-4 text-[13px] font-semibold text-white shadow-warm-sm transition active:scale-[0.97]"
            >
              <BookOpenText size={15} /> 连读
            </Link>
          </div>
        )}

        {error && <p className="mb-4 rounded-xl bg-danger-light px-4 py-2.5 text-sm text-danger">{error}</p>}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-5">
            <FormPanel
              title="记录一段家族故事"
              footer={<div className="flex gap-3">
                <WjButton type="button" variant="secondary" onClick={() => setShowForm(false)}>取消</WjButton>
                <WjButton type="submit" disabled={!form.title.trim() || submitting}>{submitting ? '保存中...' : '保存故事'}</WjButton>
              </div>}
            >
              <WjFormRow label="标题" required>
                <WjInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </WjFormRow>
              <WjFormRow label="故事年份">
                <WjInput type="number" value={form.storyYear} onChange={(e) => setForm({ ...form, storyYear: e.target.value })} />
              </WjFormRow>
              <WjFormRow label="正文">
                <WjTextarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} />
              </WjFormRow>
              <WjFormRow label="关联人物">
                <WjInput value={form.relatedPersonIds} onChange={(e) => setForm({ ...form, relatedPersonIds: e.target.value })} placeholder="多个用逗号分隔" />
              </WjFormRow>
              <WjFormRow label="可见范围">
                <WjSelect value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as Visibility })}>
                  {VISIBILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </WjSelect>
              </WjFormRow>
            </FormPanel>
          </form>
        )}

        {stories.length === 0 ? (
          <EmptyState
            illustration={<NoStoriesIllustration />}
            title="还没有家族故事"
            description="从一段回忆、一件小事开始，沉淀家族记忆"
            action={<button onClick={() => setShowForm(true)} className="wj-primary rounded-2xl px-5 min-h-[44px] text-sm font-semibold transition-colors">添加第一条故事</button>}
          />
        ) : (
          <div className="relative">
            <div className="absolute left-[45px] top-0 bottom-0 w-px bg-[var(--gold-light)]" />
            <div className="space-y-4">
              <WjTimeline>
                {stories.map((s) => (
                  <WjTimeline.Item key={s.id} title={s.title} meta={s.story_year ? `${s.story_year} 年` : new Date(s.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })}>
                    <StoryCard story={s} />
                  </WjTimeline.Item>
                ))}
              </WjTimeline>
            </div>
          </div>
        )}
      </main>
    </S>
  );
}

function S({ children, r }: { children: React.ReactNode; r: React.ReactNode }) {
  return <MobilePage><MobileStatusBar /><MobileTopBar title="人生记忆" right={r} />{children}</MobilePage>;
}
function P({ text }: { text: string }) {
  return <main className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 text-center"><p className="rounded-2xl border border-[var(--line-1)] bg-white px-4 py-5 text-sm text-[var(--ink-3)] shadow-sm">{text}</p></main>;
}
