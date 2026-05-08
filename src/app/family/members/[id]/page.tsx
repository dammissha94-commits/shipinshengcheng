'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { Edit2, Calendar, BookOpen, Camera, Clock, Plus, Mic, Image as ImageIcon, ImageDown, UserCheck } from 'lucide-react';
import type {
  BirthDatePrecision,
  FamilySpace,
  Gender,
  LivingStatus,
  PersonProfile,
  Visibility,
} from '@/types/domain';
import type { PersonRelationSummary } from '@/types/service';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { canManageFamily } from '@/lib/auth/permission-service';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import {
  getPersonBirthdayLabel,
  getPersonProfile,
  getPersonRelationSummaries,
  updatePersonBirthdate,
  updatePersonProfile,
} from '@/lib/services/member-service';
import { syncPersonBirthdayEvent, unsyncPersonBirthdayEvent } from '@/lib/services/calendar-service';
import { getKinshipLabel, normalizeRelationType } from '@/lib/kinship/kinship-adapter';
import { listBiographyRecords, createBiographyRecord, deleteBiographyRecord, formatEventDate, type BiographyRecord, type CreateBiographyInput } from '@/lib/services/biography-service';
import WjTimeline from '@/components/wujia/WjTimeline';
import { WjFormRow, WjInput, WjSelect } from '@/components/wujia/WjForm';
import { MobilePage, MobileStatusBar, MobileTopBar } from '@/components/wujia/MobileChrome';
import PageSkeleton from '@/components/ui/PageSkeleton';
import { BirthdayPoster, useExportPoster } from '@/components/poster';

const CLAIM_LABELS: Record<string, string> = { claimed: '已认领', unclaimed: '待认领', disputed: '有争议', rejected: '已拒绝', hidden: '已隐藏' };
const LIVING_LABELS: Record<string, string> = { alive: '健在', deceased: '离世', unknown: '未填写' };
const GENDER_LABELS: Record<string, string> = { male: '男', female: '女', unknown: '未知' };
const VISIBILITY_LABELS: Record<string, string> = { private: '仅自己', family: '家族可见', public: '公开' };

function relationSummaryLabel(item: PersonRelationSummary, currentPersonId: string): string {
  try {
    const otherGender = item.otherPerson?.gender ?? undefined;
    const rel = item.relation;
    if (rel.relation_type === 'parent_of') {
      if (rel.from_person_id === currentPersonId) return getKinshipLabel('child', otherGender).label;
      if (otherGender === 'male') return getKinshipLabel('father', otherGender).label;
      if (otherGender === 'female') return getKinshipLabel('mother', otherGender).label;
      return normalizeRelationType('parent_of');
    }
    if (rel.relation_type === 'spouse_of') return getKinshipLabel('spouse', otherGender).label;
    if (rel.relation_type === 'sibling_of') return normalizeRelationType('sibling_of', otherGender);
    if (rel.relation_type === 'grandparent_of') {
      if (rel.from_person_id === currentPersonId) return otherGender === 'male' ? '孙子' : otherGender === 'female' ? '孙女' : '孙辈';
      return normalizeRelationType('grandparent_of', otherGender);
    }
    return normalizeRelationType(rel.relation_type, otherGender) || item.label;
  } catch { return item.label; }
}

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [person, setPerson] = useState<PersonProfile | null>(null);
  const [relations, setRelations] = useState<PersonRelationSummary[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [canEditSelf, setCanEditSelf] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const posterRef = useRef<HTMLDivElement>(null);
  const { exportPoster, isExporting: posterExporting, error: posterError, successMessage: posterSuccess, reset: resetPoster } = useExportPoster();

  function handleExportBirthday() {
    if (!person || !family) return;
    const fileName = `${person.display_name}-生辰海报.png`;
    void exportPoster(posterRef.current, fileName);
  }
  // Biography state
  const [biographies, setBiographies] = useState<BiographyRecord[]>([]);
  const [showBioForm, setShowBioForm] = useState(false);
  const [bioSubmitting, setBioSubmitting] = useState(false);
  const [bioForm, setBioForm] = useState<{ title: string; content: string; eventYear: string; eventMonth: string; eventDay: string; location: string; visibility: CreateBiographyInput['visibility']; authorization: CreateBiographyInput['authorization'] }>({ title: '', content: '', eventYear: '', eventMonth: '', eventDay: '', location: '', visibility: 'family', authorization: 'self' });
  const [form, setForm] = useState({
    surname: '', givenName: '', displayName: '',
    gender: 'unknown' as Gender,
    birthYear: '', birthMonth: '', birthDay: '',
    birthDatePrecision: 'year_only' as BirthDatePrecision,
    deathYear: '', livingStatus: 'alive' as LivingStatus,
    visibility: 'family' as Visibility,
    bio: '', portraitUrl: '',
  });

  useEffect(() => {
    async function load() {
      if (!hasSupabaseConfig()) { setError('尚未配置 Supabase 环境变量，请先配置 .env.local'); setLoading(false); return; }
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) { router.replace('/create'); return; }
        const [profile, relationSummaries, allowed] = await Promise.all([
          getPersonProfile(params.id),
          getPersonRelationSummaries(params.id),
          canManageFamily(currentFamily.id),
        ]);
        if (!profile) throw new Error('家人档案不存在');
        if (profile.family_id !== currentFamily.id) throw new Error('你暂无权限执行此操作');
        setFamily(currentFamily);
        setPerson(profile);
        setRelations(relationSummaries);
        setCanManage(allowed);
        setCanEditSelf(profile.bound_user_id === user.id);
        // Load biography records
        try { setBiographies(await listBiographyRecords(profile.id)); } catch { /* non-critical */ }
        setForm({
          surname: profile.surname ?? '', givenName: profile.given_name ?? '',
          displayName: profile.display_name, gender: profile.gender ?? 'unknown',
          birthYear: profile.birth_year ? String(profile.birth_year) : '',
          birthMonth: profile.birth_month ? String(profile.birth_month) : '',
          birthDay: profile.birth_day ? String(profile.birth_day) : '',
          birthDatePrecision: profile.birth_date_precision ?? 'year_only',
          deathYear: profile.death_year ? String(profile.death_year) : '',
          livingStatus: profile.living_status, visibility: profile.visibility,
          bio: profile.bio ?? '', portraitUrl: profile.portrait_url ?? '',
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载家人档案失败');
      } finally { setLoading(false); }
    }
    load();
  }, [params.id, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!person) return;
    try {
      setSaving(true); setError(''); setNotice('');
      const updated = await updatePersonProfile(person.id, {
        surname: form.surname || null, givenName: form.givenName || null,
        displayName: form.displayName, gender: form.gender,
        birthYear: form.birthYear ? parseInt(form.birthYear, 10) : null,
        deathYear: form.deathYear ? parseInt(form.deathYear, 10) : null,
        livingStatus: form.livingStatus, visibility: form.visibility,
        bio: form.bio || null, portraitUrl: form.portraitUrl || null,
      });
      const birthdateUpdated = await updatePersonBirthdate(person.id, {
        birthYear: form.birthYear ? parseInt(form.birthYear, 10) : null,
        birthMonth: form.birthMonth ? parseInt(form.birthMonth, 10) : null,
        birthDay: form.birthDay ? parseInt(form.birthDay, 10) : null,
        birthDatePrecision: form.birthDatePrecision,
      });
      if (birthdateUpdated.birth_month && birthdateUpdated.birth_day) {
        await syncPersonBirthdayEvent(person.id);
        setNotice('生日提醒已同步到家族日历');
      } else {
        await unsyncPersonBirthdayEvent(person.id);
        setNotice('生日提醒已从家族日历归档');
      }
      setPerson({ ...updated, ...birthdateUpdated });
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存失败');
    } finally { setSaving(false); }
  }

  // --- Biography handlers ---
  async function handleCreateBio(e: React.FormEvent) {
    e.preventDefault();
    if (!person || !family || !bioForm.title.trim()) return;
    try {
      setBioSubmitting(true);
      const record = await createBiographyRecord({
        personId: person.id,
        familyId: family.id,
        title: bioForm.title.trim(),
        content: bioForm.content.trim(),
        eventYear: bioForm.eventYear ? parseInt(bioForm.eventYear, 10) : null,
        eventMonth: bioForm.eventMonth ? parseInt(bioForm.eventMonth, 10) : null,
        eventDay: bioForm.eventDay ? parseInt(bioForm.eventDay, 10) : null,
        location: bioForm.location.trim() || null,
        visibility: bioForm.visibility,
        relationshipToPerson: canEditSelf ? null : '亲属',
        authorization: canEditSelf ? 'self' : 'authorized',
      });
      setBiographies((cur) => [record, ...cur]);
      setBioForm({ title: '', content: '', eventYear: '', eventMonth: '', eventDay: '', location: '', visibility: 'family', authorization: 'self' });
      setShowBioForm(false);
      setNotice('人生记忆已保存');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存人生记忆失败');
    } finally { setBioSubmitting(false); }
  }

  async function handleDeleteBio(recordId: string) {
    if (!window.confirm('确认删除这条人生记忆？')) return;
    try {
      await deleteBiographyRecord(recordId);
      setBiographies((cur) => cur.filter((b) => b.id !== recordId));
      setNotice('人生记忆已删除');
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    }
  }

  if (loading) return <PageSkeleton title="家人档案" backHref="/family/members" cards={3} withStats={false} withSearch={false} />;
  if (error && !person) return <CenteredText text={error} />;
  if (!person || !family) return <CenteredText text="家人档案不存在" />;

  const canEdit = canManage || canEditSelf;
  const isClaimed = person.claim_status === 'claimed';

  return (
    <MobilePage>
      <MobileStatusBar />
      <MobileTopBar
        title="家人档案"
        backHref="/family/members"
        right={
          canEdit ? (
            <button onClick={() => setEditing((v) => !v)} className="text-sm font-medium text-[var(--walnut-light)]">
              {editing ? '取消' : <span className="flex items-center gap-1"><Edit2 size={14} />编辑</span>}
            </button>
          ) : null
        }
      />

      <div className="relative z-10 space-y-4 px-5 pb-6">
        {/* Person card */}
        <div className="relative overflow-hidden rounded-[13px] border border-[var(--line-1)] bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-2)] p-4 shadow-warm-sm">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--gold-light)]/16" />
          <div className="flex items-center gap-4">
            <div className={`flex h-[82px] w-[82px] shrink-0 items-center justify-center rounded-[13px] border-2 border-white text-[28px] font-bold shadow-warm-md ${
              person.bound_user_id ? 'bg-[var(--walnut)] text-white shadow-warm-lg' : 'bg-[var(--surface-3)] text-[var(--ink-3)]'
            }`}>
              {person.portrait_url ? (
                <NextImage
                  src={person.portrait_url}
                  alt={person.display_name}
                  width={82}
                  height={82}
                  className="h-full w-full rounded-[11px] object-cover"
                />
              ) : (
                person.display_name.charAt(0)
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-[22px] font-bold text-[var(--ink-1)]">{person.display_name}</h1>
                <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[12px] text-[var(--walnut)]">{relations[0] ? relationSummaryLabel(relations[0], person.id) : '家人'}</span>
              </div>
              <p className="mt-1 text-[13px] text-[var(--ink-3)]">
                {person.birth_year || '出生年份未填'} · {person.birth_year ? `${new Date().getFullYear() - person.birth_year} 岁` : '年龄未知'}
              </p>
              <p className="mt-1 text-[13px] text-[var(--ink-3)]">籍贯：{family.surname}氏家堂</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  isClaimed ? 'bg-[var(--surface-3)] text-[var(--jade)]' : 'bg-warning-light text-warning'
                }`}>{CLAIM_LABELS[person.claim_status]}</span>
                <span className="rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-[11px] font-medium text-[var(--walnut)]">
                  {LIVING_LABELS[person.living_status]}
                </span>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="rounded-xl bg-danger-light px-4 py-2.5 text-sm text-danger">{error}</p>}
        {notice && <p className="rounded-xl bg-[var(--surface-3)] px-4 py-2.5 text-sm text-[var(--jade)] border border-[var(--surface-3)]">{notice}</p>}
        {(posterError || posterSuccess) && (
          <button
            type="button"
            onClick={resetPoster}
            className="block w-full rounded-xl border border-[var(--line-1)] bg-[var(--surface-1)] px-4 py-2 text-left text-xs"
          >
            <span className={posterError ? 'text-[var(--terracotta)]' : 'text-[var(--jade)]'}>
              {posterError || posterSuccess}
            </span>
            <span className="ml-2 text-[var(--ink-3)]">点击关闭</span>
          </button>
        )}

        {/* 生日海报导出 — 仅在生日已填时可用 */}
        {!editing && person.birth_month && person.birth_day && (
          <button
            type="button"
            onClick={handleExportBirthday}
            disabled={posterExporting}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-1)] bg-[var(--surface-1)] px-4 min-h-[48px] text-sm font-semibold text-[var(--ink-2)] shadow-warm-sm transition active:scale-[0.99] disabled:opacity-50"
          >
            <ImageDown size={16} />
            {posterExporting ? '生成中…' : '生成生日海报'}
          </button>
        )}

        {editing ? (
          <form onSubmit={handleSave} className="overflow-hidden rounded-[13px] border border-[var(--line-1)] bg-white/86 shadow-warm-xs">
            <div className="border-b border-[var(--line-1)]/70 px-5 py-4">
              <h2 className="text-base font-semibold text-[var(--ink-1)]">编辑档案</h2>
            </div>
            <div className="space-y-4 px-5 py-5">
              {canManage && (
                <>
                  <WjFormRow label="姓名">
                    <WjInput value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
                  </WjFormRow>
                  <WjFormRow label="姓氏">
                    <WjInput value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} />
                  </WjFormRow>
                  <WjFormRow label="名字">
                    <WjInput value={form.givenName} onChange={(e) => setForm({ ...form, givenName: e.target.value })} />
                  </WjFormRow>
                  <WjFormRow label="性别">
                    <WjSelect value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}>
                      <option value="male">男</option>
                      <option value="female">女</option>
                      <option value="unknown">未知</option>
                    </WjSelect>
                  </WjFormRow>
                  <WjFormRow label="出生年份">
                    <WjInput type="number" value={form.birthYear} onChange={(e) => setForm({ ...form, birthYear: e.target.value })} />
                  </WjFormRow>
                  <WjFormRow label="离世年份">
                    <WjInput type="number" value={form.deathYear} onChange={(e) => setForm({ ...form, deathYear: e.target.value })} />
                  </WjFormRow>
                  <WjFormRow label="人生状态">
                    <WjSelect value={form.livingStatus} onChange={(e) => setForm({ ...form, livingStatus: e.target.value as LivingStatus })}>
                      <option value="alive">健在</option>
                      <option value="deceased">离世</option>
                      <option value="unknown">未填写</option>
                    </WjSelect>
                  </WjFormRow>
                  <WjFormRow label="可见范围">
                    <WjSelect value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as Visibility })}>
                      <option value="private">仅自己</option>
                      <option value="family">家族可见</option>
                      <option value="public">公开</option>
                    </WjSelect>
                  </WjFormRow>
                </>
              )}
              <div className="rounded-2xl border border-[var(--line-1)] bg-[var(--surface-2)] p-4 space-y-3">
                <p className="text-sm font-semibold text-[var(--ink-2)]">生日提醒</p>
                <WjFormRow label="出生年份">
                  <WjInput type="number" value={form.birthYear} onChange={(e) => setForm({ ...form, birthYear: e.target.value })} />
                </WjFormRow>
                <WjFormRow label="出生月份">
                  <WjInput type="number" value={form.birthMonth} onChange={(e) => setForm({ ...form, birthMonth: e.target.value })} />
                </WjFormRow>
                <WjFormRow label="出生日期">
                  <WjInput type="number" value={form.birthDay} onChange={(e) => setForm({ ...form, birthDay: e.target.value })} />
                </WjFormRow>
                <WjFormRow label="日期精确度">
                  <WjSelect value={form.birthDatePrecision} onChange={(e) => setForm({ ...form, birthDatePrecision: e.target.value as BirthDatePrecision })}>
                    <option value="unknown">未填写</option>
                    <option value="year_only">仅年份</option>
                    <option value="month_day">月日</option>
                    <option value="full_date">完整日期</option>
                  </WjSelect>
                </WjFormRow>
                <p className="text-xs text-[var(--ink-3)]">填写出生月和日后，同步到家族日历。</p>
              </div>
              <WjFormRow label="头像链接">
                <WjInput value={form.portraitUrl} onChange={(e) => setForm({ ...form, portraitUrl: e.target.value })} />
              </WjFormRow>
              <label className="block">
                <span className="block text-sm font-medium text-[var(--ink-2)] mb-1.5">家人简介</span>
                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4}
                  className="w-full rounded-xl border border-[var(--line-2)] bg-white px-4 py-2.5 text-sm text-[var(--ink-1)] transition-all placeholder:text-[var(--ink-3)] focus:border-[var(--walnut)] focus:outline-none focus:ring-2 focus:ring-[var(--walnut)]/20" />
              </label>
            </div>
            <div className="border-t border-[var(--surface-2)] px-5 py-4">
              <button disabled={saving} className="wj-primary w-full h-11 rounded-2xl text-sm font-semibold transition-all disabled:opacity-50 active:scale-[0.98]">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Info grid */}
            <div className="overflow-hidden rounded-[13px] border border-[var(--line-1)] bg-white/86 shadow-warm-xs">
              <div className="border-b border-[var(--line-1)]/70 px-5 py-4">
                <h2 className="text-base font-semibold text-[var(--ink-1)]">基础资料</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 p-5">
                {[
                  ['姓名', person.display_name],
                  ['姓氏', person.surname || '未填写'],
                  ['名字', person.given_name || '未填写'],
                  ['性别', GENDER_LABELS[person.gender ?? 'unknown']],
                  ['生日', getPersonBirthdayLabel(person)],
                  ['离世年份', person.death_year ? String(person.death_year) : '无'],
                  ['人生状态', LIVING_LABELS[person.living_status]],
                  ['认领状态', CLAIM_LABELS[person.claim_status]],
                  ['可见范围', VISIBILITY_LABELS[person.visibility]],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-[var(--line-2)] px-1 py-2.5 last:border-b-0">
                    <p className="text-xs text-[var(--ink-3)]">{label}</p>
                    <p className="mt-0.5 text-sm font-medium text-[var(--ink-1)] truncate">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Birthday */}
            <div className="rounded-[13px] border border-[var(--line-1)] bg-white/86 p-5 shadow-warm-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink-1)]">生日提醒</p>
                  <p className="mt-1 text-sm text-[var(--ink-3)]">{getPersonBirthdayLabel(person)}</p>
                </div>
                <Link href="/family/calendar" className="shrink-0 rounded-full bg-warning-light px-3 min-h-[44px] flex items-center text-xs font-medium text-warning">
                  <Calendar size={14} className="inline mr-1" />家族日历
                </Link>
              </div>
            </div>

            {/* Bio */}
            {person.bio && (
              <div className="rounded-[13px] border border-[var(--line-1)] bg-white/86 p-5 shadow-warm-xs">
                <h2 className="text-sm font-semibold text-[var(--ink-1)] mb-2">家人简介</h2>
                <p className="text-sm text-[var(--ink-2)] leading-relaxed">{person.bio}</p>
              </div>
            )}

            {/* Relations */}
            <div className="overflow-hidden rounded-[13px] border border-[var(--line-1)] bg-white/86 shadow-warm-xs">
              <div className="border-b border-[var(--line-1)]/70 px-5 py-4">
                <h2 className="text-base font-semibold text-[var(--ink-1)]">亲属关系</h2>
              </div>
              <div className="p-5">
                {relations.length === 0 ? (
                  <p className="text-sm text-[var(--ink-3)]">暂无关联系属</p>
                ) : (
                  <div className="space-y-2">
                    {relations.map((item) => (
                      <div key={item.relation.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-2)] px-4 py-2.5">
                        <span className="text-sm font-medium text-[var(--ink-2)]">{relationSummaryLabel(item, person.id)}</span>
                        <span className="text-sm text-[var(--ink-3)] truncate">{item.otherPerson?.display_name ?? '未知成员'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ===== Biography Timeline ===== */}
            <div className="overflow-hidden rounded-[13px] border border-[var(--line-1)] bg-white/86 shadow-warm-xs">
              <div className="border-b border-[var(--line-1)]/70 px-5 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[var(--ink-1)]">人生记忆</h2>
                  <p className="mt-0.5 text-xs text-[var(--ink-3)]">{biographies.length} 条记录</p>
                </div>
                <button onClick={() => setShowBioForm((v) => !v)}
                  className="wj-primary flex items-center gap-1.5 rounded-2xl px-3 min-h-[44px] text-xs font-semibold transition-colors">
                  <Plus size={14} />{showBioForm ? '收起' : '记一笔'}
                </button>
              </div>

              {/* Elder-friendly quick actions */}
              <div className="px-5 py-4 border-b border-[var(--surface-2)]">
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => { setBioForm({ ...bioForm, title: '说一段故事', content: '' }); setShowBioForm(true); }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line-1)] bg-white min-h-[44px] text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--surface-2)] transition-colors">
                    <Mic size={14} />说一段故事
                  </button>
                  <button onClick={() => { setBioForm({ ...bioForm, title: '上传老照片', content: '' }); setShowBioForm(true); }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line-1)] bg-white min-h-[44px] text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--surface-2)] transition-colors">
                    <ImageIcon size={14} />记一张照片
                  </button>
                  <button onClick={() => { setBioForm({ ...bioForm, title: '亲属回忆', content: '', authorization: 'authorized' }); setShowBioForm(true); }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-warning-light bg-warning-light min-h-[44px] text-xs font-medium text-warning hover:bg-warning-light transition-colors">
                    <UserCheck size={14} />帮家人记录
                  </button>
                </div>
              </div>

              {/* Entry form */}
              {showBioForm && (
                <form onSubmit={handleCreateBio} className="border-b border-[var(--surface-2)]">
                  <div className="px-5 py-4 space-y-3 bg-[var(--surface-2)]/50">
                    <input type="text" value={bioForm.title} onChange={(e) => setBioForm({ ...bioForm, title: e.target.value })} required
                      placeholder="标题，如：出生、考上大学、结婚"
                      className="w-full rounded-xl border border-[var(--line-2)] bg-white px-4 py-2.5 text-sm text-[var(--ink-1)] transition-all placeholder:text-[var(--ink-3)] focus:border-[var(--walnut)] focus:outline-none focus:ring-2 focus:ring-[var(--walnut)]/20" />
                    <div className="grid grid-cols-4 gap-2">
                      <input type="number" value={bioForm.eventYear} onChange={(e) => setBioForm({ ...bioForm, eventYear: e.target.value })}
                        placeholder="年份" min={1800} max={2100}
                        className="rounded-xl border border-[var(--line-2)] bg-white px-3 py-2 text-sm text-[var(--ink-1)] placeholder:text-[var(--ink-3)] focus:border-[var(--walnut)] focus:outline-none focus:ring-2 focus:ring-[var(--walnut)]/20" />
                      <input type="number" value={bioForm.eventMonth} onChange={(e) => setBioForm({ ...bioForm, eventMonth: e.target.value })}
                        placeholder="月" min={1} max={12}
                        className="rounded-xl border border-[var(--line-2)] bg-white px-3 py-2 text-sm text-[var(--ink-1)] placeholder:text-[var(--ink-3)] focus:border-[var(--walnut)] focus:outline-none focus:ring-2 focus:ring-[var(--walnut)]/20" />
                      <input type="number" value={bioForm.eventDay} onChange={(e) => setBioForm({ ...bioForm, eventDay: e.target.value })}
                        placeholder="日" min={1} max={31}
                        className="rounded-xl border border-[var(--line-2)] bg-white px-3 py-2 text-sm text-[var(--ink-1)] placeholder:text-[var(--ink-3)] focus:border-[var(--walnut)] focus:outline-none focus:ring-2 focus:ring-[var(--walnut)]/20" />
                      <select value={bioForm.visibility} onChange={(e) => setBioForm({ ...bioForm, visibility: e.target.value as CreateBiographyInput['visibility'] })}
                        className="rounded-xl border border-[var(--line-2)] bg-white px-2 py-2 text-sm text-[var(--ink-1)] focus:border-[var(--walnut)] focus:outline-none focus:ring-2 focus:ring-[var(--walnut)]/20">
                        <option value="family">家族可见</option>
                        <option value="private">仅自己</option>
                        <option value="direct_family">直系亲属</option>
                      </select>
                    </div>
                    <input type="text" value={bioForm.location} onChange={(e) => setBioForm({ ...bioForm, location: e.target.value })}
                      placeholder="地点，可选（如：北京、老家）"
                      className="w-full rounded-xl border border-[var(--line-2)] bg-white px-4 py-2.5 text-sm text-[var(--ink-1)] transition-all placeholder:text-[var(--ink-3)] focus:border-[var(--walnut)] focus:outline-none focus:ring-2 focus:ring-[var(--walnut)]/20" />
                    <textarea value={bioForm.content} onChange={(e) => setBioForm({ ...bioForm, content: e.target.value })} rows={4}
                      placeholder="一段文字，记录这件事"
                      className="w-full resize-none rounded-xl border border-[var(--line-2)] bg-white px-4 py-2.5 text-sm text-[var(--ink-1)] transition-all placeholder:text-[var(--ink-3)] focus:border-[var(--walnut)] focus:outline-none focus:ring-2 focus:ring-[var(--walnut)]/20" />
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setShowBioForm(false)}
                        className="flex-1 rounded-xl border border-[var(--line-1)] bg-white min-h-[44px] text-sm font-medium text-[var(--ink-3)] hover:bg-[var(--surface-2)] transition-colors">取消</button>
                      <button type="submit" disabled={bioSubmitting || !bioForm.title.trim()}
                        className="wj-primary flex-1 rounded-xl min-h-[44px] text-sm font-semibold disabled:opacity-50 transition-colors">
                        {bioSubmitting ? '保存中...' : '保存记录'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Timeline */}
              <div className="p-5">
                {biographies.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-[var(--ink-3)] mb-3">
                      <Clock size={22} strokeWidth={1.8} />
                    </div>
                    <p className="text-sm font-medium text-[var(--ink-2)]">还没有人生记忆</p>
                    <p className="mt-1 text-xs text-[var(--ink-3)]">点击&ldquo;记一笔&rdquo;，为{person.display_name}记录重要时刻</p>
                  </div>
                ) : (
                  <WjTimeline>
                    {biographies.map((record) => (
                      <WjTimeline.Item
                        key={record.id}
                        tone={
                          record.authorization === 'self' ? 'gold' :
                          record.authorization === 'deceased_manager' ? 'walnut' : 'gold-light'
                        }
                        title={record.title}
                        meta={`${formatEventDate(record)}${record.location ? ` · ${record.location}` : ''}`}
                      >
                        {record.content && (
                          <p className="whitespace-pre-wrap">{record.content}</p>
                        )}
                        {record.relationship_to_person && (
                          <p className="mt-1 text-xs text-[var(--ink-3)]">
                            由{record.relationship_to_person}代录
                          </p>
                        )}
                        {(canManage || record.recorded_by === person.bound_user_id) && (
                          <button onClick={() => handleDeleteBio(record.id)}
                            className="mt-1 text-xs text-danger hover:text-red-700 transition-colors">删除</button>
                        )}
                      </WjTimeline.Item>
                    ))}
                  </WjTimeline>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/family/stories" className="flex items-center justify-center gap-2 rounded-xl border border-[var(--line-1)] bg-white py-3 text-sm font-medium text-[var(--ink-2)] shadow-warm-xs hover:bg-[var(--surface-2)] transition-colors">
                <BookOpen size={15} strokeWidth={1.8} />相关故事
              </Link>
              <Link href="/family/photos" className="flex items-center justify-center gap-2 rounded-xl border border-[var(--line-1)] bg-white py-3 text-sm font-medium text-[var(--ink-2)] shadow-warm-xs hover:bg-[var(--surface-2)] transition-colors">
                <Camera size={15} strokeWidth={1.8} />相关照片
              </Link>
            </div>

            {/* Invite CTA */}
            {person.claim_status === 'unclaimed' && (
              <Link href="/family/invite" className="wj-primary flex items-center justify-center gap-2 w-full rounded-2xl py-3 text-sm font-semibold transition-colors">
                邀请认领此档案
              </Link>
            )}
          </>
        )}
      </div>

      {/* 离屏生日海报 */}
      <BirthdayPoster
        ref={posterRef}
        surname={family.surname}
        familyDisplayName={family.displayName ?? family.display_name ?? ''}
        personName={person.display_name}
        age={person.birth_year ? new Date().getFullYear() - person.birth_year : null}
      />
    </MobilePage>
  );
}

function CenteredText({ text }: { text: string }) {
  return <div className="wj-page flex min-h-screen items-center justify-center px-4 text-center"><p className="text-sm text-[var(--ink-3)]">{text}</p></div>;
}
