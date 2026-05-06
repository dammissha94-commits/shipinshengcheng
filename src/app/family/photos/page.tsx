'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Camera, X, ChevronLeft, ChevronRight, Upload, Image } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig, createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { createFamilyPhoto, listFamilyPhotos } from '@/lib/services/photo-service';
import type { FamilyPhoto, FamilySpace, Visibility } from '@/types/domain';
import AppHeader from '@/components/AppHeader';
import EmptyState from '@/components/wujia/EmptyState';
import FormPanel from '@/components/wujia/FormPanel';

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'family', label: '家族可见' }, { value: 'private', label: '仅自己' }, { value: 'public', label: '公开' },
];

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PhotosPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [photos, setPhotos] = useState<FamilyPhoto[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: '', photoYear: '', imageUrl: '', description: '', visibility: 'family' as Visibility });

  useEffect(() => {
    async function load() {
      if (!hasSupabaseConfig()) { setError('尚未配置 Supabase 环境变量，请先配置 .env.local'); setLoading(false); return; }
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) { router.replace('/create'); return; }
        setFamily(currentFamily);
        setPhotos(await listFamilyPhotos(currentFamily.id));
      } catch (e) { setError(e instanceof Error ? e.message : '加载家族相册失败'); }
      finally { setLoading(false); }
    }
    load();
  }, [router]);

  /** Pick a file from device */
  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('文件大小不能超过 10MB'); return; }
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowForm(true);
    // Auto-fill title from filename
    const name = file.name.replace(/\.[^/.]+$/, '');
    setForm((f) => ({ ...f, title: f.title || name }));
  }

  /** Upload file to Supabase Storage, then save to DB */
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!family || !form.title.trim()) return;

    try {
      setSubmitting(true); setError('');

      let finalUrl = form.imageUrl.trim() || null;

      // Upload file if one is pending
      if (pendingFile) {
        setUploading(true); setUploadProgress('正在上传...');
        const supabase = createSupabaseBrowserClient();
        const filePath = `${family.id}/${Date.now()}-${pendingFile.name}`;

        // Try to ensure bucket exists
        try { await supabase.storage.createBucket('family-photos', { public: true, fileSizeLimit: 10485760, allowedMimeTypes: ['image/jpeg','image/png','image/webp','image/gif'] }); } catch { /* bucket may already exist or insufficient permissions */ }

        const { error: uploadError } = await supabase.storage
          .from('family-photos')
          .upload(filePath, pendingFile, { upsert: false });

        if (uploadError) {
          if (uploadError.message.includes('Bucket not found')) {
            throw new Error('存储桶未创建。请在 Supabase 控制台 → Storage 中创建名为 family-photos 的公开存储桶，然后重试。');
          }
          throw new Error('照片上传失败：' + uploadError.message);
        }
        setUploadProgress('上传成功');

        // Get public URL
        const { data: urlData } = supabase.storage.from('family-photos').getPublicUrl(filePath);
        finalUrl = urlData.publicUrl;
      }

      const photo = await createFamilyPhoto({
        familyId: family.id, title: form.title.trim(),
        photoYear: form.photoYear ? Number(form.photoYear) : null,
        imageUrl: finalUrl,
        description: form.description.trim() || null,
        relatedPersonIds: [],
        visibility: form.visibility,
      });

      setPhotos((c) => [photo, ...c]);
      setForm({ title: '', photoYear: '', imageUrl: '', description: '', visibility: 'family' });
      setPendingFile(null); setPreviewUrl(null); setShowForm(false); setUploadProgress('');
    } catch (e) { setError(e instanceof Error ? e.message : '保存照片失败'); }
    finally { setSubmitting(false); setUploading(false); }
  }

  // Derived data
  const yearSet = useMemo(() => {
    const years = new Set<number>();
    photos.forEach((p) => { if (p.photo_year) years.add(p.photo_year); });
    return Array.from(years).sort((a, b) => b - a);
  }, [photos]);

  const filteredPhotos = useMemo(
    () => filterYear === 'all' ? photos : photos.filter((p) => p.photo_year === filterYear),
    [photos, filterYear]
  );

  const lightboxPhotos = filteredPhotos.filter((p) => p.image_url);

  function openLightbox(index: number) {
    const urlIndex = lightboxPhotos.findIndex((p) => p.id === filteredPhotos[index]?.id);
    if (urlIndex >= 0) setLightboxIndex(urlIndex);
  }
  function closeLightbox() { setLightboxIndex(null); }
  function prevPhoto() { setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i)); }
  function nextPhoto() { setLightboxIndex((i) => (i !== null && i < lightboxPhotos.length - 1 ? i + 1 : i)); }

  if (loading) return <C text="加载中..." />;
  if (!hasSupabaseConfig()) return <S r={null}><P text="尚未配置 Supabase 环境变量，请先配置 .env.local" /></S>;
  if (error && !family) return <S r={null}><P text={error} /></S>;

  return (
    <S r={<button onClick={() => { setShowForm((v) => !v); setPendingFile(null); setPreviewUrl(null); }} className="flex h-8 w-8 items-center justify-center rounded-full text-#8D6E63 hover:bg-stone-200" aria-label="新增照片"><Plus size={18} strokeWidth={2.5} /></button>}>
      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="mb-5 rounded-2xl bg-#5A3524 p-5 text-white">
          <p className="text-xs text-white/40 tracking-widest font-medium">家族相册</p>
          <h1 className="mt-0.5 text-xl font-bold">{family?.displayName}</h1>
          <p className="mt-1 text-sm text-white/55">
            {photos.length} 张照片 · 覆盖 {yearSet.length} 个年份
          </p>
        </div>

        {/* Quick Upload Button (always visible) */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-300 bg-white py-4 text-sm font-semibold text-stone-500 shadow-sm hover:border-emerald-300 hover:text-#8D6E63 transition-all">
            <Camera size={18} />拍摄 / 上传照片
          </button>
          <button onClick={() => { setPendingFile(null); setPreviewUrl(null); setShowForm((v) => !v); }}
            className="flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white py-4 text-sm font-semibold text-stone-500 shadow-sm hover:border-stone-300 hover:text-stone-700 transition-all">
            <Upload size={18} />填写照片信息
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
            onChange={handleFilePick} className="hidden" />
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-5">
            <FormPanel
              title={pendingFile ? '上传照片' : '新增照片记录'}
              footer={<FA submitting={submitting || uploading} disabled={!form.title.trim()} onCancel={() => { setShowForm(false); setPendingFile(null); setPreviewUrl(null); }} submitLabel={pendingFile ? '上传并保存' : '保存照片'} />}
            >
              {/* Preview */}
              {previewUrl && (
                <div className="rounded-xl overflow-hidden border border-stone-200">
                  <img src={previewUrl} alt="预览" className="w-full max-h-48 object-cover" />
                </div>
              )}

              {/* Upload progress */}
              {uploadProgress && (
                <p className="text-sm text-#8D6E63 bg-#F0E6D5 rounded-xl px-4 py-2.5">{uploadProgress}</p>
              )}

              <F label="标题" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
              <div className="grid grid-cols-2 gap-3">
                <F label="年份" type="number" value={form.photoYear} onChange={(v) => setForm({ ...form, photoYear: v })} />
                <VS value={form.visibility} onChange={(v) => setForm({ ...form, visibility: v })} />
              </div>

              {!pendingFile && (
                <F label="图片 URL（可选）" value={form.imageUrl} onChange={(v) => setForm({ ...form, imageUrl: v })} placeholder="https://...，不上传图片时填写" />
              )}

              <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">说明</span>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
                  className="w-full resize-none rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20 transition-all" />
              </label>
            </FormPanel>
          </form>
        )}

        {/* Year filter */}
        {yearSet.length > 1 && (
          <div className="mb-4 flex gap-2 overflow-x-auto">
            <button onClick={() => setFilterYear('all')}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${filterYear === 'all' ? 'bg-#5A3524 text-white' : 'border border-stone-200 bg-white text-stone-500 hover:border-stone-300'}`}>全部</button>
            {yearSet.map((y) => (
              <button key={y} onClick={() => setFilterYear(y)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${filterYear === y ? 'bg-#5A3524 text-white' : 'border border-stone-200 bg-white text-stone-500 hover:border-stone-300'}`}>{y}</button>
            ))}
          </div>
        )}

        {/* Masonry Grid */}
        {filteredPhotos.length === 0 ? (
          <EmptyState
            icon={<Camera size={24} strokeWidth={1.8} />}
            title={filterYear !== 'all' ? `${filterYear} 年暂无照片` : '还没有照片记录'}
            description={filterYear !== 'all' ? '试试其他年份' : '点击上方按钮拍摄或上传第一张照片'}
            action={filterYear === 'all' ? <button onClick={() => fileInputRef.current?.click()} className="rounded-xl bg-#5A3524 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-#4E342E transition-colors"><Camera size={16} className="inline mr-2" />拍摄 / 上传</button> : undefined}
          />
        ) : (
          <div className="masonry-grid">
            {filteredPhotos.map((photo, i) => (
              <div key={photo.id} className="masonry-item mb-3 break-inside-avoid">
                <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md cursor-pointer group"
                  onClick={() => openLightbox(i)}>
                  {photo.image_url ? (
                    <div className="relative overflow-hidden">
                      <img src={photo.image_url} alt={photo.title || '照片'}
                        className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        style={{ minHeight: photo.description ? 160 : 220 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <Image size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-36 flex-col items-center justify-center bg-stone-100">
                      <Camera className="mb-2 text-stone-300" size={28} strokeWidth={1.5} />
                      <span className="text-xs font-medium text-stone-400">{photo.photo_year ? `${photo.photo_year} 年` : '暂无图片'}</span>
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="truncate text-sm font-semibold text-stone-800">{photo.title}</h3>
                    {photo.description && <p className="mt-1 line-clamp-2 text-xs text-stone-500">{photo.description}</p>}
                    <div className="mt-2 flex items-center justify-between text-xs text-stone-400">
                      <span>{photo.photo_year ? `${photo.photo_year} 年` : '年份未填'} · {formatDate(photo.created_at)}</span>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}

        {/* ===== Lightbox Modal ===== */}
        {lightboxIndex !== null && lightboxPhotos[lightboxIndex] && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={closeLightbox}>
            <button onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
              <X size={22} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
              disabled={lightboxIndex <= 0}
              className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 transition-colors">
              <ChevronLeft size={28} />
            </button>
            <div className="max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
              <img src={lightboxPhotos[lightboxIndex].image_url ?? ''}
                alt={lightboxPhotos[lightboxIndex].title}
                className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl" />
              <div className="mt-3 text-center text-white/80">
                <p className="text-sm font-semibold">{lightboxPhotos[lightboxIndex].title}</p>
                {lightboxPhotos[lightboxIndex].description && (
                  <p className="mt-1 text-xs text-white/50">{lightboxPhotos[lightboxIndex].description}</p>
                )}
                <p className="mt-1 text-xs text-white/40">{lightboxIndex + 1} / {lightboxPhotos.length}</p>
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
              disabled={lightboxIndex >= lightboxPhotos.length - 1}
              className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30 transition-colors">
              <ChevronRight size={28} />
            </button>
          </div>
        )}
      </main>
    </S>
  );
}

/* ---- Sub Components ---- */

function S({ children, r }: { children: React.ReactNode; r: React.ReactNode }) {
  return <div className="min-h-screen bg-[#F8F1E7]"><AppHeader title="家族相册" backHref="/family" rightElement={r} />{children}</div>;
}
function C({ text }: { text: string }) {
  return <div className="min-h-screen bg-[#F8F1E7] flex items-center justify-center"><p className="text-sm text-stone-500">{text}</p></div>;
}
function P({ text }: { text: string }) {
  return <main className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 text-center"><p className="rounded-2xl border border-stone-200 bg-white px-4 py-5 text-sm text-stone-500 shadow-sm">{text}</p></main>;
}
function F({ label, value, onChange, type = 'text', required, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">{label}{required && <span className="text-red-400"> *</span>}</span>
    <input type={type} required={required} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20 transition-all" /></label>;
}
function VS({ value, onChange }: { value: Visibility; onChange: (v: Visibility) => void }) {
  return <label className="block"><span className="block text-sm font-medium text-stone-700 mb-1.5">可见范围</span>
    <select value={value} onChange={(e) => onChange(e.target.value as Visibility)}
      className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20 transition-all">
      {VISIBILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
function FA({ submitting, disabled, onCancel, submitLabel }: { submitting: boolean; disabled: boolean; onCancel: () => void; submitLabel: string }) {
  return <div className="border-t border-stone-100 px-5 py-4 flex gap-3">
    <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-sm font-medium text-stone-500 hover:bg-[#F8F1E7] transition-colors">取消</button>
    <button disabled={disabled || submitting} className="flex-1 rounded-xl bg-#5A3524 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-#4E342E disabled:opacity-50 transition-all active:scale-[0.98]">{submitting ? '保存中...' : submitLabel}</button></div>;
}
