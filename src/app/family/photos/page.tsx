'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { createFamilyPhoto, listFamilyPhotos } from '@/lib/services/photo-service';
import type { FamilyPhoto, FamilySpace, Visibility } from '@/types/domain';
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

function PhotoCard({ photo, index }: { photo: FamilyPhoto; index: number }) {
  const tones = ['bg-gold/12', 'bg-pine/10', 'bg-sand/80', 'bg-cream'];
  const tone = tones[index % tones.length];

  return (
    <article className="overflow-hidden rounded-2xl border border-sand/70 bg-card shadow-sm">
      {photo.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.image_url} alt={photo.title} className="h-36 w-full object-cover" />
      ) : (
        <div className={`flex h-36 flex-col items-center justify-center px-3 text-center ${tone}`}>
          <PhotoIcon className="mb-2 text-charcoal/35" />
          <span className="text-xs font-medium text-charcoal/50">
            {photo.photo_year ? `${photo.photo_year} 年` : '图片占位'}
          </span>
        </div>
      )}
      <div className="p-3">
        <h3 className="truncate text-sm font-semibold text-charcoal">{photo.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
          {photo.description?.trim() || '暂无说明'}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted/70">
          <span>{photo.photo_year ? `${photo.photo_year} 年` : '年份未填'}</span>
          <span>{VISIBILITY_OPTIONS.find((item) => item.value === photo.visibility)?.label ?? '家族可见'}</span>
        </div>
      </div>
    </article>
  );
}

export default function PhotosPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [photos, setPhotos] = useState<FamilyPhoto[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    photoYear: '',
    imageUrl: '',
    description: '',
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

        const records = await listFamilyPhotos(currentFamily.id);
        setFamily(currentFamily);
        setPhotos(records);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载家族相册失败');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const photoCount = useMemo(() => photos.length, [photos.length]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!family || !form.title.trim()) return;

    try {
      setSubmitting(true);
      setError('');
      const photo = await createFamilyPhoto({
        familyId: family.id,
        title: form.title.trim(),
        photoYear: form.photoYear ? Number(form.photoYear) : null,
        imageUrl: form.imageUrl.trim() || null,
        description: form.description.trim() || null,
        relatedPersonIds: parseRelatedPersonIds(form.relatedPersonIds),
        visibility: form.visibility,
      });
      setPhotos((current) => [photo, ...current]);
      setForm({
        title: '',
        photoYear: '',
        imageUrl: '',
        description: '',
        relatedPersonIds: '',
        visibility: 'family',
      });
      setShowForm(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '保存照片记录失败');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <CenteredText text="加载中..." />;

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
          aria-label="新增照片记录"
        >
          <PlusIcon />
        </button>
      }
    >
      <main className="mx-auto max-w-md px-4 py-6">
        <div className="mb-5 rounded-2xl bg-pine p-5 text-cream">
          <p className="mb-1 text-xs tracking-wider text-cream/60">家族相册</p>
          <h1 className="text-xl font-bold">{family?.displayName}</h1>
          <p className="mt-1 text-sm text-cream/70">{photoCount} 条照片记录</p>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-5 space-y-3 rounded-2xl border border-pine/20 bg-card p-4 shadow-sm">
            <p className="text-sm font-semibold text-pine">新增照片记录</p>
            <Field label="标题" value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
            <Field label="年份" type="number" value={form.photoYear} onChange={(value) => setForm({ ...form, photoYear: value })} />
            <Field label="图片 URL 或占位" value={form.imageUrl} onChange={(value) => setForm({ ...form, imageUrl: value })} />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-charcoal">说明</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows={3}
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
            <FormActions submitting={submitting} disabled={!form.title.trim()} onCancel={() => setShowForm(false)} submitLabel="保存照片" />
          </form>
        )}

        {photos.length === 0 ? (
          <EmptyState
            icon={<PhotoIcon />}
            title="还没有照片记录"
            description="先保存照片标题、年份和说明，后续再接入真实上传。"
            action={{ label: '添加第一条照片', onClick: () => setShowForm(true) }}
          />
        ) : (
          <section>
            <SectionTitle title="家族相册" subtitle="照片记录与家族记忆说明" />
            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo, index) => <PhotoCard key={photo.id} photo={photo} index={index} />)}
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
      <AppHeader title="家族相册" backHref="/family" rightElement={rightElement} />
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

function PhotoIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21,15 16,10 5,21" />
    </svg>
  );
}
