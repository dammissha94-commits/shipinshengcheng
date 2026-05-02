'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, BookOpen } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { createFamilyStory, listFamilyStories } from '@/lib/services/story-service';
import type { FamilySpace, FamilyStory, Visibility } from '@/types/domain';
import AppHeader from '@/components/AppHeader';
import EmptyState from '@/components/wujia/EmptyState';
import FormPanel from '@/components/wujia/FormPanel';

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
    <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-stone-800">{story.title}</h3>
          <p className="mt-1 text-xs text-stone-500">{story.story_year ? `${story.story_year} 年` : '年份未填'} · {story.author_user_id ? `成员` : '家族成员'}</p>
        </div>
        <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-500">
          {VISIBILITY_OPTIONS.find((o) => o.value === story.visibility)?.label ?? '家族可见'}
        </span>
      </div>
      <p className="line-clamp-3 text-sm text-stone-500">{story.content?.trim() || '暂无正文'}</p>
      <p className="mt-3 text-xs text-stone-400">{formatDate(story.created_at)}</p>
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

  if (loading) return <C text="加载中..." />;
  if (!hasSupabaseConfig()) return <S r={null}><P text="尚未配置 Supabase 环境变量，请先配置 .env.local" /></S>;
  if (error && !family) return <S r={null}><P text={error} /></S>;

  return (
    <S r={<button onClick={() => setShowForm((v) => !v)} className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-700 hover:bg-stone-200" aria-label="新增故事"><Plus size={18} strokeWidth={2.5} /></button>}>
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-5 rounded-2xl bg-emerald-950 p-5 text-white">
          <p className="text-xs text-white/40 tracking-widest font-medium">家族故事库</p>
          <h1 className="mt-0.5 text-xl font-bold">{family?.displayName}</h1>
          <p className="mt-1 text-sm text-white/55">{stories.length} 条记录</p>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-5">
            <FormPanel
              title="记录一段家族故事"
              footer={<FA submitting={submitting} disabled={!form.title.trim()} onCancel={() => setShowForm(false)} submitLabel="保存故事" />}
            >
              <F label="标题" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
              <F label="故事年份" type="number" value={form.storyYear} onChange={(v) => setForm({ ...form, storyYear: v })} />
              <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">正文</span>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5}
                  className="w-full resize-none rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all" />
              </label>
              <F label="关联人物" value={form.relatedPersonIds} onChange={(v) => setForm({ ...form, relatedPersonIds: v })} placeholder="多个用逗号分隔" />
              <VS value={form.visibility} onChange={(v) => setForm({ ...form, visibility: v })} />
            </FormPanel>
          </form>
        )}

        {stories.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={24} strokeWidth={1.8} />}
            title="还没有家族故事"
            description="从一段回忆、一件小事开始，沉淀家族记忆"
            action={<button onClick={() => setShowForm(true)} className="rounded-xl bg-emerald-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 transition-colors">添加第一条故事</button>}
          />
        ) : (
          <div className="space-y-3">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="h-4 w-[3px] rounded-full bg-amber-500/60" />
              <h2 className="text-base font-semibold text-stone-800">家族故事</h2>
              <span className="text-xs text-stone-400">{stories.length} 条</span>
            </div>
            {stories.map((s) => <StoryCard key={s.id} story={s} />)}
          </div>
        )}
      </main>
    </S>
  );
}

function S({ children, r }: { children: React.ReactNode; r: React.ReactNode }) {
  return <div className="min-h-screen bg-stone-50"><AppHeader title="家族故事" backHref="/family" rightElement={r} />{children}</div>;
}
function C({ text }: { text: string }) {
  return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-sm text-stone-500">{text}</p></div>;
}
function P({ text }: { text: string }) {
  return <main className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 text-center"><p className="rounded-2xl border border-stone-200 bg-white px-4 py-5 text-sm text-stone-500 shadow-sm">{text}</p></main>;
}
function F({ label, value, onChange, type = 'text', required, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">{label}{required && <span className="text-red-400"> *</span>}</span>
    <input type={type} required={required} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all" /></label>;
}
function VS({ value, onChange }: { value: Visibility; onChange: (v: Visibility) => void }) {
  return <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">可见范围</span>
    <select value={value} onChange={(e) => onChange(e.target.value as Visibility)}
      className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all">
      {VISIBILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
function FA({ submitting, disabled, onCancel, submitLabel }: { submitting: boolean; disabled: boolean; onCancel: () => void; submitLabel: string }) {
  return <div className="border-t border-stone-100 px-5 py-4 flex gap-3">
    <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors">取消</button>
    <button disabled={disabled || submitting} className="flex-1 rounded-xl bg-emerald-950 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 disabled:opacity-50 transition-all active:scale-[0.98]">{submitting ? '保存中...' : submitLabel}</button></div>;
}
