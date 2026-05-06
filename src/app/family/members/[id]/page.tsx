'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Edit2, Calendar, BookOpen, Camera, Clock, Plus, Mic, Image, UserCheck, Trash2 } from 'lucide-react';
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
import AppHeader from '@/components/AppHeader';

const CLAIM_LABELS: Record<string, string> = { claimed: '已认领', unclaimed: '待认领', disputed: '有争议' };
const LIVING_LABELS: Record<string, string> = { alive: '在世', deceased: '已故', unknown: '未知' };
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
      setNotice('生平记录已保存');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存生平记录失败');
    } finally { setBioSubmitting(false); }
  }

  async function handleDeleteBio(recordId: string) {
    if (!window.confirm('确认删除这条生平记录？')) return;
    try {
      await deleteBiographyRecord(recordId);
      setBiographies((cur) => cur.filter((b) => b.id !== recordId));
      setNotice('生平记录已删除');
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    }
  }

  if (loading) return <CenteredText text="加载中..." />;
  if (error && !person) return <CenteredText text={error} />;
  if (!person || !family) return <CenteredText text="家人档案不存在" />;

  const canEdit = canManage || canEditSelf;
  const isClaimed = person.claim_status === 'claimed';

  return (
    <div className="min-h-screen bg-[#F8F1E7]">
      <AppHeader
        title="家人档案"
        backHref="/family/members"
        rightElement={
          canEdit ? (
            <button onClick={() => setEditing((v) => !v)} className="text-sm font-medium text-#8D6E63">
              {editing ? '取消' : <span className="flex items-center gap-1"><Edit2 size={14} />编辑</span>}
            </button>
          ) : null
        }
      />

      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        {/* Person card */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold ${
              person.bound_user_id ? 'bg-#5A3524 text-white' : 'bg-stone-100 text-stone-500'
            }`}>
              {person.display_name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-stone-900">{person.display_name}</h1>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  isClaimed ? 'bg-#F0E6D5 text-#8D6E63' : 'bg-amber-50 text-amber-700'
                }`}>{CLAIM_LABELS[person.claim_status]}</span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                  {LIVING_LABELS[person.living_status]}
                </span>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
        {notice && <p className="rounded-xl bg-#F0E6D5 px-4 py-2.5 text-sm text-#8D6E63 border border-emerald-200">{notice}</p>}

        {editing ? (
          <form onSubmit={handleSave} className="rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-5 py-4">
              <h2 className="text-base font-semibold text-stone-800">编辑档案</h2>
            </div>
            <div className="space-y-4 px-5 py-5">
              {canManage && (
                <>
                  <Field label="姓名" value={form.displayName} onChange={(v) => setForm({ ...form, displayName: v })} />
                  <Field label="姓氏" value={form.surname} onChange={(v) => setForm({ ...form, surname: v })} />
                  <Field label="名字" value={form.givenName} onChange={(v) => setForm({ ...form, givenName: v })} />
                  <SelectField label="性别" value={form.gender} onChange={(v) => setForm({ ...form, gender: v as Gender })} options={[['male','男'],['female','女'],['unknown','未知']]} />
                  <Field label="出生年份" type="number" value={form.birthYear} onChange={(v) => setForm({ ...form, birthYear: v })} />
                  <Field label="去世年份" type="number" value={form.deathYear} onChange={(v) => setForm({ ...form, deathYear: v })} />
                  <SelectField label="在世状态" value={form.livingStatus} onChange={(v) => setForm({ ...form, livingStatus: v as LivingStatus })} options={[['alive','在世'],['deceased','已故'],['unknown','未知']]} />
                  <SelectField label="可见范围" value={form.visibility} onChange={(v) => setForm({ ...form, visibility: v as Visibility })} options={[['private','仅自己'],['family','家族可见'],['public','公开']]} />
                </>
              )}
              <div className="rounded-xl border border-stone-200 bg-[#F8F1E7] p-4 space-y-3">
                <p className="text-sm font-semibold text-stone-700">生日提醒</p>
                <Field label="出生年份" type="number" value={form.birthYear} onChange={(v) => setForm({ ...form, birthYear: v })} />
                <Field label="出生月份" type="number" value={form.birthMonth} onChange={(v) => setForm({ ...form, birthMonth: v })} />
                <Field label="出生日期" type="number" value={form.birthDay} onChange={(v) => setForm({ ...form, birthDay: v })} />
                <SelectField label="日期精确度" value={form.birthDatePrecision} onChange={(v) => setForm({ ...form, birthDatePrecision: v as BirthDatePrecision })} options={[['unknown','未填写'],['year_only','仅年份'],['month_day','月日'],['full_date','完整日期']]} />
                <p className="text-xs text-stone-400">填写出生月和日后，同步到家族日历。</p>
              </div>
              <Field label="头像链接" value={form.portraitUrl} onChange={(v) => setForm({ ...form, portraitUrl: v })} />
              <label className="block">
                <span className="block text-sm font-medium text-stone-700 mb-1.5">家人简介</span>
                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4}
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20 transition-all" />
              </label>
            </div>
            <div className="border-t border-stone-100 px-5 py-4">
              <button disabled={saving} className="w-full h-11 rounded-xl bg-#5A3524 text-sm font-semibold text-white shadow-sm transition-all hover:bg-#4E342E disabled:opacity-50 active:scale-[0.98]">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Info grid */}
            <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="border-b border-stone-100 px-5 py-4">
                <h2 className="text-base font-semibold text-stone-800">基础资料</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 p-5">
                {[
                  ['姓名', person.display_name],
                  ['姓氏', person.surname || '未填写'],
                  ['名字', person.given_name || '未填写'],
                  ['性别', GENDER_LABELS[person.gender ?? 'unknown']],
                  ['生日', getPersonBirthdayLabel(person)],
                  ['去世年份', person.death_year ? String(person.death_year) : '无'],
                  ['在世状态', LIVING_LABELS[person.living_status]],
                  ['认领状态', CLAIM_LABELS[person.claim_status]],
                  ['可见范围', VISIBILITY_LABELS[person.visibility]],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-stone-100 bg-[#F8F1E7] px-3 py-2.5">
                    <p className="text-xs text-stone-400">{label}</p>
                    <p className="mt-0.5 text-sm font-medium text-stone-800 truncate">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Birthday */}
            <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-800">生日提醒</p>
                  <p className="mt-1 text-sm text-stone-500">{getPersonBirthdayLabel(person)}</p>
                </div>
                <Link href="/family/calendar" className="shrink-0 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                  <Calendar size={14} className="inline mr-1" />家族日历
                </Link>
              </div>
            </div>

            {/* Bio */}
            {person.bio && (
              <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-5">
                <h2 className="text-sm font-semibold text-stone-800 mb-2">家人简介</h2>
                <p className="text-sm text-stone-600 leading-relaxed">{person.bio}</p>
              </div>
            )}

            {/* Relations */}
            <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="border-b border-stone-100 px-5 py-4">
                <h2 className="text-base font-semibold text-stone-800">亲属关系</h2>
              </div>
              <div className="p-5">
                {relations.length === 0 ? (
                  <p className="text-sm text-stone-400">暂无关联系属</p>
                ) : (
                  <div className="space-y-2">
                    {relations.map((item) => (
                      <div key={item.relation.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#F8F1E7] px-4 py-2.5">
                        <span className="text-sm font-medium text-stone-700">{relationSummaryLabel(item, person.id)}</span>
                        <span className="text-sm text-stone-500 truncate">{item.otherPerson?.display_name ?? '未知成员'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ===== Biography Timeline ===== */}
            <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
              <div className="border-b border-stone-100 px-5 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-stone-800">生平记录</h2>
                  <p className="mt-0.5 text-xs text-stone-400">{biographies.length} 条记录</p>
                </div>
                <button onClick={() => setShowBioForm((v) => !v)}
                  className="flex items-center gap-1.5 rounded-xl bg-#5A3524 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-#4E342E transition-colors">
                  <Plus size={14} />{showBioForm ? '收起' : '记一笔'}
                </button>
              </div>

              {/* Elder-friendly quick actions */}
              <div className="px-5 py-4 border-b border-stone-100">
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => { setBioForm({ ...bioForm, title: '说一段故事', content: '' }); setShowBioForm(true); }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-medium text-stone-600 hover:bg-[#F8F1E7] transition-colors">
                    <Mic size={14} />说一段故事
                  </button>
                  <button onClick={() => { setBioForm({ ...bioForm, title: '上传老照片', content: '' }); setShowBioForm(true); }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-medium text-stone-600 hover:bg-[#F8F1E7] transition-colors">
                    <Image size={14} />记一张照片
                  </button>
                  <button onClick={() => { setBioForm({ ...bioForm, title: '亲属回忆', content: '', authorization: 'authorized' }); setShowBioForm(true); }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors">
                    <UserCheck size={14} />帮家人记录
                  </button>
                </div>
              </div>

              {/* Entry form */}
              {showBioForm && (
                <form onSubmit={handleCreateBio} className="border-b border-stone-100">
                  <div className="px-5 py-4 space-y-3 bg-[#F8F1E7]/50">
                    <input type="text" value={bioForm.title} onChange={(e) => setBioForm({ ...bioForm, title: e.target.value })} required
                      placeholder="标题，如：出生、考上大学、结婚"
                      className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20 transition-all" />
                    <div className="grid grid-cols-4 gap-2">
                      <input type="number" value={bioForm.eventYear} onChange={(e) => setBioForm({ ...bioForm, eventYear: e.target.value })}
                        placeholder="年份" min={1800} max={2100}
                        className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20" />
                      <input type="number" value={bioForm.eventMonth} onChange={(e) => setBioForm({ ...bioForm, eventMonth: e.target.value })}
                        placeholder="月" min={1} max={12}
                        className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20" />
                      <input type="number" value={bioForm.eventDay} onChange={(e) => setBioForm({ ...bioForm, eventDay: e.target.value })}
                        placeholder="日" min={1} max={31}
                        className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20" />
                      <select value={bioForm.visibility} onChange={(e) => setBioForm({ ...bioForm, visibility: e.target.value as CreateBiographyInput['visibility'] })}
                        className="rounded-xl border border-stone-300 bg-white px-2 py-2 text-sm text-stone-900 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20">
                        <option value="family">家族可见</option>
                        <option value="private">仅自己</option>
                        <option value="direct_family">直系亲属</option>
                      </select>
                    </div>
                    <input type="text" value={bioForm.location} onChange={(e) => setBioForm({ ...bioForm, location: e.target.value })}
                      placeholder="地点，可选（如：北京、老家）"
                      className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20 transition-all" />
                    <textarea value={bioForm.content} onChange={(e) => setBioForm({ ...bioForm, content: e.target.value })} rows={4}
                      placeholder="一段文字，记录这件事"
                      className="w-full resize-none rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20 transition-all" />
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setShowBioForm(false)}
                        className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-sm font-medium text-stone-500 hover:bg-[#F8F1E7] transition-colors">取消</button>
                      <button type="submit" disabled={bioSubmitting || !bioForm.title.trim()}
                        className="flex-1 rounded-xl bg-#5A3524 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-#4E342E disabled:opacity-50 transition-colors">
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
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 mb-3">
                      <Clock size={22} strokeWidth={1.8} />
                    </div>
                    <p className="text-sm font-medium text-stone-600">还没有生平记录</p>
                    <p className="mt-1 text-xs text-stone-400">点击&ldquo;记一笔&rdquo;，为{person.display_name}记录重要时刻</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline vertical line */}
                    <div className="absolute left-[15px] top-2 bottom-2 w-px bg-stone-200" />
                    <div className="space-y-3">
                      {biographies.map((record) => (
                        <div key={record.id} className="relative flex gap-4 pl-1">
                          {/* Timeline dot */}
                          <div className={`relative z-10 mt-1.5 flex h-[8px] w-[8px] shrink-0 rounded-full border-2 border-white ${
                            record.authorization === 'self' ? 'bg-#F0E6D50' :
                            record.authorization === 'deceased_manager' ? 'bg-[#F8F1E7]0' : 'bg-amber-400'
                          }`} />
                          <div className="flex-1 pb-2">
                            <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-sm">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-semibold text-stone-800">{record.title}</h4>
                                  <p className="mt-0.5 text-xs text-stone-400">
                                    {formatEventDate(record)}
                                    {record.location ? ` · ${record.location}` : ''}
                                  </p>
                                </div>
                                {(canManage || record.recorded_by === person.bound_user_id) && (
                                  <button onClick={() => handleDeleteBio(record.id)}
                                    className="shrink-0 text-stone-300 hover:text-red-400 transition-colors" title="删除">
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                              {record.content && (
                                <p className="mt-2 text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">{record.content}</p>
                              )}
                              {record.relationship_to_person && (
                                <p className="mt-2 text-xs text-stone-400">
                                  由{record.relationship_to_person}代录
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/family/stories" className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-sm font-medium text-stone-600 shadow-sm hover:bg-[#F8F1E7] transition-colors">
                <BookOpen size={15} strokeWidth={1.8} />相关故事
              </Link>
              <Link href="/family/photos" className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-sm font-medium text-stone-600 shadow-sm hover:bg-[#F8F1E7] transition-colors">
                <Camera size={15} strokeWidth={1.8} />相关照片
              </Link>
            </div>

            {/* Invite CTA */}
            {person.claim_status === 'unclaimed' && (
              <Link href="/family/invite" className="flex items-center justify-center gap-2 w-full rounded-xl bg-#5A3524 py-3 text-sm font-semibold text-white shadow-sm hover:bg-#4E342E transition-colors">
                邀请认领此档案
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-stone-700 mb-1.5">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20 transition-all" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-stone-700 mb-1.5">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-#8B5A3C focus:outline-none focus:ring-2 focus:ring-#8B5A3C/20 transition-all">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function CenteredText({ text }: { text: string }) {
  return <div className="min-h-screen bg-[#F8F1E7] flex items-center justify-center px-4 text-center"><p className="text-sm text-stone-500">{text}</p></div>;
}
