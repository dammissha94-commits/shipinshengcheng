'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { createFamilyStory, listFamilyStories } from '@/lib/services/story-service';
import type { FamilySpace, FamilyStory, Visibility } from '@/types/domain';
import AppHeader from '@/components/AppHeader';
import EmptyState from '@/components/EmptyState';
import SectionTitle from '@/components/SectionTitle';

const SUPABASE_FALLBACK_MESSAGE = '尚未配置 Supabase 环境变量，请先配置 .env.local';

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'family', label: '家族可见' },
  { value: 'private', label: '仅自己' },
  { value: 'public', label: '公开' },
];

function parseRelatedPersonIds(value: string): string[] {
  return value
    .split(/[,\n，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function authorLabel(story: FamilyStory): string {
  return story.author_user_id ? `成员 ${story.author_user_id.slice(0, 8)}` : '家族成员';
}

function StoryCard({ story }: { story: FamilyStory }) {
  const summary = story.content?.trim() || '暂无正文';

  return (
    <article className="rounded-2xl border border-sand/70 bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug text-charcoal">{story.title}</h3>
          <p className="mt-1 text-xs text-muted">
            {story.story_year ? `${story.story_year} 年` : '年份未填'} · {authorLabel(story)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold">
          {VISIBILITY_OPTIONS.find((item) => item.value === story.visibility)?.label ?? '家族可见'}
        </span>
      </div>
      <p className="line-clamp-3 text-sm leading-relaxed text-muted">{summary}</p>
      <p className="mt-3 text-xs text-muted/70">创建于 {formatDate(story.created_at)}</p>
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
  const [form, setForm] = useState({
    title: '',
    storyYear: '',
    content: '',
    relatedPersonIds: '',
    visibility: 'family' as Visibility,
  });

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

        const records = await listFamilyStories(currentFamily.id);
        setFamily(currentFamily);
        setStories(records);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载家族故事失败');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const storyCount = useMemo(() => stories.length, [stories.length]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!family || !form.title.trim()) return;

    try {
      setSubmitting(true);
      setError('');
      const story = await createFamilyStory({
        familyId: family.id,
        title: form.title.trim(),
        storyYear: form.storyYear ? Number(form.storyYear) : null,
        content: form.content.trim() || null,
        relatedPersonIds: parseRelatedPersonIds(form.relatedPersonIds),
        visibility: form.visibility,
      });
      setStories((current) => [story, ...current]);
      setForm({ title: '', storyYear: '', content: '', relatedPersonIds: '', visibility: 'family' });
      setShowForm(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '保存家族故事失败');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <CenteredText text="加载中..." />;
  }

  if (!hasSupabaseConfig()) {
    return <Shell rightElement={null}><CenteredPanel text={SUPABASE_FALLBACK_MESSAGE} /></Shell>;
  }

  if (error && !family) {
    return <Shell rightElement={null}><CenteredPanel text={error} /></Shell>;
  }

  return (
    <Shell
      rightElement={
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-pine transition-colors hover:bg-sand"
          aria-label="新增故事"
        >
          <PlusIcon />
        </button>
      }
    >
      <main className="mx-auto max-w-md px-4 py-6">
        <div className="mb-5 rounded-2xl bg-pine p-5 text-cream">
          <p className="mb-1 text-xs tracking-wider text-cream/60">家族故事库</p>
          <h1 className="text-xl font-bold">{family?.displayName}</h1>
          <p className="mt-1 text-sm text-cream/70">{storyCount} 条记录</p>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-5 space-y-3 rounded-2xl border border-pine/20 bg-card p-4 shadow-sm">
            <p className="text-sm font-semibold text-pine">记录一段家族故事</p>
            <Field label="标题" value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
            <Field label="故事年份" type="number" value={form.storyYear} onChange={(value) => setForm({ ...form, storyYear: value })} />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-charcoal">正文</span>
              <textarea
                value={form.content}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
                rows={5}
                className="w-full resize-none rounded-xl border-2 border-sand bg-cream px-3 py-2.5 text-sm focus:border-pine focus:outline-none"
              />
            </label>
            <Field
              label="关联人物"
              value={form.relatedPersonIds}
              onChange={(value) => setForm({ ...form, relatedPersonIds: value })}
              placeholder="可填人物 ID，多个用逗号分隔"
            />
            <VisibilitySelect value={form.visibility} onChange={(value) => setForm({ ...form, visibility: value })} />
            <FormActions submitting={submitting} disabled={!form.title.trim()} onCancel={() => setShowForm(false)} submitLabel="保存故事" />
          </form>
        )}

        {stories.length === 0 ? (
          <EmptyState
            icon={<BookIcon />}
            title="还没有家族故事"
            description="从一段回忆、一件小事开始，沉淀家族记忆。"
            action={{ label: '添加第一条故事', onClick: () => setShowForm(true) }}
          />
        ) : (
          <section>
            <SectionTitle title="家族故事" subtitle="家史片段、人物回忆与家庭往事" />
            <div className="space-y-3">
              {stories.map((story) => <StoryCard key={story.id} story={story} />)}
            </div>
          </section>
        )}
      </main>
    </Shell>
  );
}

function Shell({ children, rightElement }: { children: React.ReactNode; rightElement: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream">
      <AppHeader title="家族故事" backHref="/family" rightElement={rightElement} />
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

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-charcoal">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border-2 border-sand bg-cream px-3 py-2.5 text-sm focus:border-pine focus:outline-none"
      />
    </label>
  );
}

function VisibilitySelect({ value, onChange }: { value: Visibility; onChange: (value: Visibility) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-charcoal">可见范围</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Visibility)}
        className="w-full rounded-xl border-2 border-sand bg-cream px-3 py-2.5 text-sm focus:border-pine focus:outline-none"
      >
        {VISIBILITY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function FormActions({
  submitting,
  disabled,
  onCancel,
  submitLabel,
}: {
  submitting: boolean;
  disabled: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onCancel} className="flex-1 rounded-xl border-2 border-sand py-2.5 text-sm font-medium text-muted">
        取消
      </button>
      <button disabled={disabled || submitting} className="flex-1 rounded-xl bg-pine py-2.5 text-sm font-semibold text-cream disabled:cursor-not-allowed disabled:opacity-50">
        {submitting ? '保存中...' : submitLabel}
      </button>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
