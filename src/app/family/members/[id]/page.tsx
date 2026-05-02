'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Edit2, Calendar, BookOpen, Camera } from 'lucide-react';
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

  if (loading) return <CenteredText text="加载中..." />;
  if (error && !person) return <CenteredText text={error} />;
  if (!person || !family) return <CenteredText text="家人档案不存在" />;

  const canEdit = canManage || canEditSelf;
  const isClaimed = person.claim_status === 'claimed';

  return (
    <div className="min-h-screen bg-stone-50">
      <AppHeader
        title="家人档案"
        backHref="/family/members"
        rightElement={
          canEdit ? (
            <button onClick={() => setEditing((v) => !v)} className="text-sm font-medium text-emerald-700">
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
              person.bound_user_id ? 'bg-emerald-950 text-white' : 'bg-stone-100 text-stone-500'
            }`}>
              {person.display_name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-stone-900">{person.display_name}</h1>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  isClaimed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>{CLAIM_LABELS[person.claim_status]}</span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                  {LIVING_LABELS[person.living_status]}
                </span>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
        {notice && <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 border border-emerald-200">{notice}</p>}

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
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
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
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all" />
              </label>
            </div>
            <div className="border-t border-stone-100 px-5 py-4">
              <button disabled={saving} className="w-full h-11 rounded-xl bg-emerald-950 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-900 disabled:opacity-50 active:scale-[0.98]">
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
                  <div key={label} className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5">
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
                      <div key={item.relation.id} className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-4 py-2.5">
                        <span className="text-sm font-medium text-stone-700">{relationSummaryLabel(item, person.id)}</span>
                        <span className="text-sm text-stone-500 truncate">{item.otherPerson?.display_name ?? '未知成员'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/family/stories" className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-sm font-medium text-stone-600 shadow-sm hover:bg-stone-50 transition-colors">
                <BookOpen size={15} strokeWidth={1.8} />相关故事
              </Link>
              <Link href="/family/photos" className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white py-3 text-sm font-medium text-stone-600 shadow-sm hover:bg-stone-50 transition-colors">
                <Camera size={15} strokeWidth={1.8} />相关照片
              </Link>
            </div>

            {/* Invite CTA */}
            {person.claim_status === 'unclaimed' && (
              <Link href="/family/invite" className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-950 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 transition-colors">
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
        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-stone-700 mb-1.5">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function CenteredText({ text }: { text: string }) {
  return <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 text-center"><p className="text-sm text-stone-500">{text}</p></div>;
}
