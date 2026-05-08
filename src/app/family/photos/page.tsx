'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import NextImage from 'next/image';
import { useRouter } from 'next/navigation';
import { Camera, ChevronLeft, ChevronRight, Image as ImageIcon, Plus, X } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { createSupabaseBrowserClient, hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { createFamilyPhoto, listFamilyPhotos } from '@/lib/services/photo-service';
import type { FamilyPhoto, FamilySpace, Visibility } from '@/types/domain';
import { MobilePage, MobileStatusBar, MobileTopBar } from '@/components/wujia/MobileChrome';
import { WjCardHeader, WjHeroPanel, WjPaperCard, WjScreenContent, WjSoftNote } from '@/components/wujia/MobileDesignSystem';
import { WjButton, WjFormRow, WjInput, WjSelect } from '@/components/wujia/WjForm';

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'family', label: '家族可见' },
  { value: 'private', label: '仅自己' },
  { value: 'public', label: '公开' },
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
  const [form, setForm] = useState({
    title: '',
    photoYear: '',
    imageUrl: '',
    description: '',
    visibility: 'family' as Visibility,
  });

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
        setFamily(currentFamily);
        setPhotos(await listFamilyPhotos(currentFamily.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载家族相册失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  function handleFilePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过 10MB');
      return;
    }
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowForm(true);
    const name = file.name.replace(/\.[^/.]+$/, '');
    setForm((current) => ({ ...current, title: current.title || name }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!family || !form.title.trim()) return;

    try {
      setSubmitting(true);
      setError('');

      let finalUrl = form.imageUrl.trim() || null;

      if (pendingFile) {
        setUploading(true);
        setUploadProgress('正在上传...');
        const supabase = createSupabaseBrowserClient();
        const filePath = `${family.id}/${Date.now()}-${pendingFile.name}`;

        const { error: uploadError } = await supabase.storage.from('family-photos').upload(filePath, pendingFile, { upsert: false });

        if (uploadError) {
          if (uploadError.message.includes('Bucket not found')) {
            throw new Error('照片存储桶尚未创建或未完成私有权限配置。请先执行最新 Storage migration 后重试。');
          }
          throw new Error('照片上传失败，请检查网络或权限后重试');
        }
        setUploadProgress('上传成功');
        finalUrl = filePath;
      }

      const photo = await createFamilyPhoto({
        familyId: family.id,
        title: form.title.trim(),
        photoYear: form.photoYear ? Number(form.photoYear) : null,
        imageUrl: finalUrl,
        description: form.description.trim() || null,
        relatedPersonIds: [],
        visibility: form.visibility,
      });

      setPhotos((current) => [photo, ...current]);
      setForm({ title: '', photoYear: '', imageUrl: '', description: '', visibility: 'family' });
      setPendingFile(null);
      setPreviewUrl(null);
      setShowForm(false);
      setUploadProgress('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存照片失败');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  const yearSet = useMemo(() => {
    const years = new Set<number>();
    photos.forEach((photo) => {
      if (photo.photo_year) years.add(photo.photo_year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [photos]);

  const filteredPhotos = useMemo(() => (filterYear === 'all' ? photos : photos.filter((photo) => photo.photo_year === filterYear)), [photos, filterYear]);
  const lightboxPhotos = filteredPhotos.filter((photo) => photo.image_url);

  function openLightbox(index: number) {
    const urlIndex = lightboxPhotos.findIndex((photo) => photo.id === filteredPhotos[index]?.id);
    if (urlIndex >= 0) setLightboxIndex(urlIndex);
  }
  function closeLightbox() {
    setLightboxIndex(null);
  }
  function prevPhoto() {
    setLightboxIndex((current) => (current !== null && current > 0 ? current - 1 : current));
  }
  function nextPhoto() {
    setLightboxIndex((current) => (current !== null && current < lightboxPhotos.length - 1 ? current + 1 : current));
  }

  if (loading) return <S right={null}><PanelText text="加载家族相册中..." /></S>;
  if (!hasSupabaseConfig()) return <S right={null}><PanelText text="尚未配置 Supabase 环境变量，请先配置 .env.local" /></S>;
  if (error && !family) return <S right={null}><PanelText text={error} /></S>;

  const right = (
    <button
      onClick={() => {
        setShowForm((value) => !value);
        setPendingFile(null);
        setPreviewUrl(null);
      }}
      className="flex h-11 w-11 items-center justify-center rounded-full text-[#8B5A3C] hover:bg-[#F1E5D6]"
      aria-label="新增照片"
    >
      <Plus size={18} strokeWidth={2.5} />
    </button>
  );

  return (
    <S right={right}>
      <WjScreenContent>
        <WjHeroPanel
          eyebrow="FAMILY ALBUM"
          title={family?.displayName ?? '家族相册'}
          description={`${photos.length} 张照片 · 覆盖 ${yearSet.length} 个年份，把家庭影像整理成可回看的记忆资产。`}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-[15px] border-2 border-dashed border-[#E7D9C9] bg-white/76 py-4 text-sm font-semibold text-[#5A3524] shadow-[0_10px_24px_rgba(90,53,36,0.06)] transition-all hover:border-[#C8A46B] active:scale-[0.99]"
        >
          <Camera size={18} />
          拍摄或上传照片
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFilePick} className="hidden" />

        {error && <p className="rounded-xl bg-danger-light px-4 py-2.5 text-sm text-danger">{error}</p>}

        {showForm && (
          <form onSubmit={handleSubmit}>
            <WjPaperCard className="overflow-hidden">
              <WjCardHeader title={pendingFile ? '上传照片' : '新增照片记录'} description="先保存标题和年份，后续可以继续补充相关人物。" />
              <div className="space-y-4 px-5 py-5">
                {previewUrl && (
                  <div className="overflow-hidden rounded-[15px] border border-[#E7D9C9]">
                    <NextImage src={previewUrl} alt="预览" width={400} height={192} className="max-h-48 w-full object-cover" unoptimized />
                  </div>
                )}

                {uploadProgress && <WjSoftNote>{uploadProgress}</WjSoftNote>}

                <WjFormRow label="标题" required>
                  <WjInput value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
                </WjFormRow>

                <div className="grid grid-cols-2 gap-3">
                  <WjFormRow label="年份">
                    <WjInput type="number" value={form.photoYear} onChange={(event) => setForm({ ...form, photoYear: event.target.value })} />
                  </WjFormRow>
                  <WjFormRow label="可见范围">
                    <WjSelect value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as Visibility })}>
                      {VISIBILITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </WjSelect>
                  </WjFormRow>
                </div>

                {!pendingFile && (
                  <WjFormRow label="图片 URL（可选）">
                    <WjInput value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://..." />
                  </WjFormRow>
                )}

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[#5A3524]">说明</span>
                  <textarea
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    rows={3}
                    className="min-h-[96px] w-full resize-none rounded-[14px] border border-[#E7D9C9] bg-white px-4 py-2.5 text-sm text-[#2A1D16] placeholder:text-[#A38C6F] focus:border-[#8B5A3C] focus:outline-none focus:ring-2 focus:ring-[#8B5A3C]/20"
                  />
                </label>
              </div>
              <div className="flex gap-3 border-t border-[#EEE3D6] px-5 py-4">
                <WjButton type="button" variant="secondary" onClick={() => { setShowForm(false); setPendingFile(null); setPreviewUrl(null); }}>取消</WjButton>
                <WjButton type="submit" disabled={!form.title.trim() || submitting || uploading}>
                  {submitting || uploading ? '保存中...' : pendingFile ? '上传并保存' : '保存照片'}
                </WjButton>
              </div>
            </WjPaperCard>
          </form>
        )}

        {yearSet.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterYear('all')}
              className={`flex min-h-[44px] shrink-0 items-center rounded-full px-4 text-xs font-medium transition-all ${filterYear === 'all' ? 'bg-[#5A3825] text-white' : 'border border-[#E7D9C9] bg-white/82 text-[#78675B]'}`}
            >
              全部
            </button>
            {yearSet.map((year) => (
              <button
                key={year}
                onClick={() => setFilterYear(year)}
                className={`flex min-h-[44px] shrink-0 items-center rounded-full px-4 text-xs font-medium transition-all ${filterYear === year ? 'bg-[#5A3825] text-white' : 'border border-[#E7D9C9] bg-white/82 text-[#78675B]'}`}
              >
                {year}
              </button>
            ))}
          </div>
        )}

        {filteredPhotos.length === 0 ? (
          <WjPaperCard className="p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F1E5D6] text-[#9B6A37]">
              <Camera size={24} />
            </div>
            <h2 className="mt-4 text-[18px] font-semibold text-[#2A1D16]">{filterYear !== 'all' ? `${filterYear} 年暂无照片` : '还没有照片记录'}</h2>
            <p className="mt-2 text-[13px] leading-6 text-[#78675B]">{filterYear !== 'all' ? '试试切换其他年份。' : '点击上方按钮拍摄或上传第一张照片。'}</p>
            {filterYear === 'all' && (
              <button onClick={() => fileInputRef.current?.click()} className="mt-5 inline-flex min-h-[44px] items-center rounded-[14px] bg-[#5A3825] px-5 text-sm font-semibold text-white">
                <Camera size={16} className="mr-2" /> 拍摄 / 上传
              </button>
            )}
          </WjPaperCard>
        ) : (
          <div className="masonry-grid">
            {filteredPhotos.map((photo, index) => (
              <div key={photo.id} className="masonry-item mb-3 break-inside-avoid">
                <article
                  className="group cursor-pointer overflow-hidden rounded-[18px] border border-[#E7D9C9] bg-white/86 shadow-[0_10px_28px_rgba(90,53,36,0.06)] transition-all hover:-translate-y-0.5"
                  onClick={() => openLightbox(index)}
                >
                  {photo.image_url ? (
                    <div className="relative overflow-hidden">
                      <NextImage
                        src={photo.image_url}
                        alt={photo.title || '照片'}
                        width={400}
                        height={400}
                        sizes="(max-width: 640px) 50vw, 200px"
                        className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        style={{ minHeight: photo.description ? 160 : 220 }}
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
                        <ImageIcon size={24} className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-36 flex-col items-center justify-center bg-[#FBF7EF]">
                      <Camera className="mb-2 text-[#8C7768]" size={28} strokeWidth={1.5} />
                      <span className="text-xs font-medium text-[#78675B]">{photo.photo_year ? `${photo.photo_year} 年` : '暂无图片'}</span>
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="truncate text-sm font-semibold text-[#2A1D16]">{photo.title}</h3>
                    {photo.description && <p className="mt-1 line-clamp-2 text-xs text-[#78675B]">{photo.description}</p>}
                    <div className="mt-2 text-xs text-[#78675B]">
                      <span>{photo.photo_year ? `${photo.photo_year} 年` : '年份未填'} · {formatDate(photo.created_at)}</span>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}

        {lightboxIndex !== null && lightboxPhotos[lightboxIndex] && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={closeLightbox}>
            <button onClick={closeLightbox} className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20" aria-label="关闭预览">
              <X size={22} />
            </button>
            <button onClick={(event) => { event.stopPropagation(); prevPhoto(); }} disabled={lightboxIndex <= 0} className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30" aria-label="上一张">
              <ChevronLeft size={28} />
            </button>
            <div className="max-h-[85vh] max-w-[90vw]" onClick={(event) => event.stopPropagation()}>
              <NextImage
                src={lightboxPhotos[lightboxIndex].image_url ?? ''}
                alt={lightboxPhotos[lightboxIndex].title ?? '照片'}
                width={1600}
                height={1200}
                sizes="90vw"
                className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
              />
              <div className="mt-3 text-center text-white/80">
                <p className="text-sm font-semibold">{lightboxPhotos[lightboxIndex].title}</p>
                {lightboxPhotos[lightboxIndex].description && <p className="mt-1 text-xs text-white/50">{lightboxPhotos[lightboxIndex].description}</p>}
                <p className="mt-1 text-xs text-white/40">{lightboxIndex + 1} / {lightboxPhotos.length}</p>
              </div>
            </div>
            <button onClick={(event) => { event.stopPropagation(); nextPhoto(); }} disabled={lightboxIndex >= lightboxPhotos.length - 1} className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30" aria-label="下一张">
              <ChevronRight size={28} />
            </button>
          </div>
        )}
      </WjScreenContent>
    </S>
  );
}

function S({ children, right }: { children: React.ReactNode; right: React.ReactNode }) {
  return (
    <MobilePage>
      <MobileStatusBar />
      <MobileTopBar title="家族相册" right={right} />
      {children}
    </MobilePage>
  );
}

function PanelText({ text }: { text: string }) {
  return (
    <main className="relative z-10 flex min-h-[70vh] items-center justify-center px-5 text-center">
      <p className="rounded-[15px] border border-[#E7D9C9] bg-white/82 px-4 py-5 text-sm text-[#78675B] shadow-[0_10px_28px_rgba(90,53,36,0.06)]">{text}</p>
    </main>
  );
}
