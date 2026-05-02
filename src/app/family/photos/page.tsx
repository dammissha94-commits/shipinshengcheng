'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Camera } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { createFamilyPhoto, listFamilyPhotos } from '@/lib/services/photo-service';
import type { FamilyPhoto, FamilySpace, Visibility } from '@/types/domain';
import AppHeader from '@/components/AppHeader';
import EmptyState from '@/components/wujia/EmptyState';
import FormPanel from '@/components/wujia/FormPanel';

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'family', label: '家族可见' }, { value: 'private', label: '仅自己' }, { value: 'public', label: '公开' },
];

function parseRelatedPersonIds(value: string): string[] {
  return value.split(/[,\n，]/).map((s) => s.trim()).filter(Boolean);
}

function PhotoCard({ photo, index }: { photo: FamilyPhoto; index: number }) {
  const tones = ['bg-amber-50', 'bg-emerald-50', 'bg-stone-100', 'bg-white'];
  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md">
      {photo.image_url ? (
        <img src={photo.image_url} alt={photo.title} className="h-36 w-full object-cover" />
      ) : (
        <div className={`flex h-36 flex-col items-center justify-center px-3 text-center ${tones[index % tones.length]}`}>
          <Camera className="mb-2 text-stone-300" size={28} strokeWidth={1.5} />
          <span className="text-xs font-medium text-stone-400">{photo.photo_year ? `${photo.photo_year} 年` : '图片占位'}</span>
        </div>
      )}
      <div className="p-3">
        <h3 className="truncate text-sm font-semibold text-stone-800">{photo.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-stone-500">{photo.description?.trim() || '暂无说明'}</p>
        <div className="mt-2 flex items-center justify-between text-xs text-stone-400">
          <span>{photo.photo_year ? `${photo.photo_year} 年` : '年份未填'}</span>
          <span>{VISIBILITY_OPTIONS.find((o) => o.value === photo.visibility)?.label ?? '家族可见'}</span>
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
  const [form, setForm] = useState({ title: '', photoYear: '', imageUrl: '', description: '', relatedPersonIds: '', visibility: 'family' as Visibility });

  useEffect(() => {
    async function load() {
      if (!hasSupabaseConfig()) { setError('尚未配置 Supabase 环境变量，请先配置 .env.local'); setLoading(false); return; }
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) { router.replace('/create'); return; }
        const records = await listFamilyPhotos(currentFamily.id);
        setFamily(currentFamily); setPhotos(records);
      } catch (e) { setError(e instanceof Error ? e.message : '加载家族相册失败'); }
      finally { setLoading(false); }
    }
    load();
  }, [router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!family || !form.title.trim()) return;
    try {
      setSubmitting(true); setError('');
      const photo = await createFamilyPhoto({ familyId: family.id, title: form.title.trim(), photoYear: form.photoYear ? Number(form.photoYear) : null, imageUrl: form.imageUrl.trim() || null, description: form.description.trim() || null, relatedPersonIds: parseRelatedPersonIds(form.relatedPersonIds), visibility: form.visibility });
      setPhotos((c) => [photo, ...c]);
      setForm({ title: '', photoYear: '', imageUrl: '', description: '', relatedPersonIds: '', visibility: 'family' }); setShowForm(false);
    } catch (e) { setError(e instanceof Error ? e.message : '保存照片记录失败'); }
    finally { setSubmitting(false); }
  }

  if (loading) return <C text="加载中..." />;
  if (!hasSupabaseConfig()) return <S r={null}><P text="尚未配置 Supabase 环境变量，请先配置 .env.local" /></S>;
  if (error && !family) return <S r={null}><P text={error} /></S>;

  return (
    <S r={<button onClick={() => setShowForm((v) => !v)} className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-700 hover:bg-stone-200" aria-label="新增照片"><Plus size={18} strokeWidth={2.5} /></button>}>
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-5 rounded-2xl bg-emerald-950 p-5 text-white">
          <p className="text-xs text-white/40 tracking-widest font-medium">家族相册</p>
          <h1 className="mt-0.5 text-xl font-bold">{family?.displayName}</h1>
          <p className="mt-1 text-sm text-white/55">{photos.length} 条照片记录</p>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-5">
            <FormPanel
              title="新增照片记录"
              footer={<FA submitting={submitting} disabled={!form.title.trim()} onCancel={() => setShowForm(false)} submitLabel="保存照片" />}
            >
              <F label="标题" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
              <F label="年份" type="number" value={form.photoYear} onChange={(v) => setForm({ ...form, photoYear: v })} />
              <F label="图片 URL" value={form.imageUrl} onChange={(v) => setForm({ ...form, imageUrl: v })} />
              <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">说明</span>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
                  className="w-full resize-none rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all" />
              </label>
              <F label="关联人物" value={form.relatedPersonIds} onChange={(v) => setForm({ ...form, relatedPersonIds: v })} placeholder="多个用逗号分隔" />
              <VS value={form.visibility} onChange={(v) => setForm({ ...form, visibility: v })} />
            </FormPanel>
          </form>
        )}

        {photos.length === 0 ? (
          <EmptyState
            icon={<Camera size={24} strokeWidth={1.8} />}
            title="还没有照片记录"
            description="保存照片标题、年份和说明，后续再接入真实上传"
            action={<button onClick={() => setShowForm(true)} className="rounded-xl bg-emerald-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 transition-colors">添加第一条照片</button>}
          />
        ) : (
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <div className="h-4 w-[3px] rounded-full bg-amber-500/60" />
              <h2 className="text-base font-semibold text-stone-800">家族相册</h2>
              <span className="text-xs text-stone-400">{photos.length} 条</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((p, i) => <PhotoCard key={p.id} photo={p} index={i} />)}
            </div>
          </div>
        )}
      </main>
    </S>
  );
}

function S({ children, r }: { children: React.ReactNode; r: React.ReactNode }) {
  return <div className="min-h-screen bg-stone-50"><AppHeader title="家族相册" backHref="/family" rightElement={r} />{children}</div>;
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
