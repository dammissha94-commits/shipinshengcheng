'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
import {
  syncPersonBirthdayEvent,
  unsyncPersonBirthdayEvent,
} from '@/lib/services/calendar-service';
import { getKinshipLabel, normalizeRelationType } from '@/lib/kinship/kinship-adapter';
import AppHeader from '@/components/AppHeader';

const CLAIM_LABELS = {
  claimed: '已认领',
  unclaimed: '待认领',
  disputed: '有争议',
} as const;

const LIVING_LABELS = {
  alive: '在世',
  deceased: '已故',
  unknown: '未知',
} as const;

const GENDER_LABELS = {
  male: '男',
  female: '女',
  unknown: '未知',
} as const;

const VISIBILITY_LABELS = {
  private: '仅自己',
  family: '家族可见',
  public: '公开',
} as const;

function relationSummaryLabel(item: PersonRelationSummary, currentPersonId: string): string {
  try {
    const otherGender = item.otherPerson?.gender ?? undefined;
    const relation = item.relation;

    if (relation.relation_type === 'parent_of') {
      if (relation.from_person_id === currentPersonId) {
        return getKinshipLabel('child', otherGender).label;
      }
      if (otherGender === 'male') return getKinshipLabel('father', otherGender).label;
      if (otherGender === 'female') return getKinshipLabel('mother', otherGender).label;
      return normalizeRelationType('parent_of');
    }

    if (relation.relation_type === 'spouse_of') {
      return getKinshipLabel('spouse', otherGender).label;
    }

    if (relation.relation_type === 'sibling_of') {
      return normalizeRelationType('sibling_of', otherGender);
    }

    if (relation.relation_type === 'grandparent_of') {
      if (relation.from_person_id === currentPersonId) {
        if (otherGender === 'male') return '孙子';
        if (otherGender === 'female') return '孙女';
        return '孙辈';
      }
      return normalizeRelationType('grandparent_of', otherGender);
    }

    return normalizeRelationType(relation.relation_type, otherGender) || item.label;
  } catch {
    return item.label;
  }
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
    surname: '',
    givenName: '',
    displayName: '',
    gender: 'unknown' as Gender,
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    birthDatePrecision: 'year_only' as BirthDatePrecision,
    deathYear: '',
    livingStatus: 'alive' as LivingStatus,
    visibility: 'family' as Visibility,
    bio: '',
    portraitUrl: '',
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

        const [profile, relationSummaries, allowed] = await Promise.all([
          getPersonProfile(params.id),
          getPersonRelationSummaries(params.id),
          canManageFamily(currentFamily.id),
        ]);

        if (!profile) {
          throw new Error('家人档案不存在');
        }

        if (profile.family_id !== currentFamily.id) {
          throw new Error('你暂无权限执行此操作');
        }

        setFamily(currentFamily);
        setPerson(profile);
        setRelations(relationSummaries);
        setCanManage(allowed);
        setCanEditSelf(profile.bound_user_id === user.id);
        setForm({
          surname: profile.surname ?? '',
          givenName: profile.given_name ?? '',
          displayName: profile.display_name,
          gender: profile.gender ?? 'unknown',
          birthYear: profile.birth_year ? String(profile.birth_year) : '',
          birthMonth: profile.birth_month ? String(profile.birth_month) : '',
          birthDay: profile.birth_day ? String(profile.birth_day) : '',
          birthDatePrecision: profile.birth_date_precision ?? 'year_only',
          deathYear: profile.death_year ? String(profile.death_year) : '',
          livingStatus: profile.living_status,
          visibility: profile.visibility,
          bio: profile.bio ?? '',
          portraitUrl: profile.portrait_url ?? '',
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载家人档案失败');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [params.id, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!person) return;

    try {
      setSaving(true);
      setError('');
      setNotice('');
      const updated = await updatePersonProfile(person.id, {
        surname: form.surname || null,
        givenName: form.givenName || null,
        displayName: form.displayName,
        gender: form.gender,
        birthYear: form.birthYear ? parseInt(form.birthYear, 10) : null,
        deathYear: form.deathYear ? parseInt(form.deathYear, 10) : null,
        livingStatus: form.livingStatus,
        visibility: form.visibility,
        bio: form.bio || null,
        portraitUrl: form.portraitUrl || null,
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
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <CenteredText text="加载中..." />;
  if (error && !person) return <CenteredText text={error} />;
  if (!person || !family) return <CenteredText text="家人档案不存在" />;

  const canEdit = canManage || canEditSelf;

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader
        title="家人档案"
        backHref="/family/members"
        rightElement={
          canEdit ? (
            <button
              type="button"
              onClick={() => setEditing((value) => !value)}
              className="text-xs text-pine"
            >
              {editing ? '取消' : '编辑'}
            </button>
          ) : null
        }
      />

      <main className="px-4 py-5 max-w-md mx-auto">
        <div className="bg-card rounded-2xl border border-sand/60 shadow-sm p-5 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-sand text-pine font-bold text-xl flex items-center justify-center">
              {person.display_name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-charcoal">{person.display_name}</h1>
              <p className="text-sm text-muted">
                {CLAIM_LABELS[person.claim_status]} · {LIVING_LABELS[person.living_status]}
              </p>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 mb-4">{error}</p>}
        {notice && <p className="text-sm text-pine bg-gold/10 border border-gold/30 rounded-xl px-3 py-2 mb-4">{notice}</p>}

        {editing ? (
          <form onSubmit={handleSave} className="bg-card rounded-2xl border border-sand/60 shadow-sm p-4 space-y-3">
            {canManage ? (
              <>
                <Field label="姓名" value={form.displayName} onChange={(value) => setForm({ ...form, displayName: value })} />
                <Field label="姓氏" value={form.surname} onChange={(value) => setForm({ ...form, surname: value })} />
                <Field label="名字" value={form.givenName} onChange={(value) => setForm({ ...form, givenName: value })} />
                <SelectField
                  label="性别"
                  value={form.gender}
                  onChange={(value) => setForm({ ...form, gender: value as Gender })}
                  options={[
                    ['male', '男'],
                    ['female', '女'],
                    ['unknown', '未知'],
                  ]}
                />
                <Field label="出生年份" type="number" value={form.birthYear} onChange={(value) => setForm({ ...form, birthYear: value })} />
                <Field label="去世年份" type="number" value={form.deathYear} onChange={(value) => setForm({ ...form, deathYear: value })} />
                <SelectField
                  label="在世状态"
                  value={form.livingStatus}
                  onChange={(value) => setForm({ ...form, livingStatus: value as LivingStatus })}
                  options={[
                    ['alive', '在世'],
                    ['deceased', '已故'],
                    ['unknown', '未知'],
                  ]}
                />
                <SelectField
                  label="可见范围"
                  value={form.visibility}
                  onChange={(value) => setForm({ ...form, visibility: value as Visibility })}
                  options={[
                    ['private', '仅自己'],
                    ['family', '家族可见'],
                    ['public', '公开'],
                  ]}
                />
              </>
            ) : null}

            {(canManage || canEditSelf) && (
              <>
                <div className="rounded-2xl border border-sand/70 bg-cream/70 p-3 space-y-3">
                  <p className="text-sm font-semibold text-pine">生日提醒</p>
                  <Field label="出生年份" type="number" value={form.birthYear} onChange={(value) => setForm({ ...form, birthYear: value })} />
                  <Field label="出生月份" type="number" value={form.birthMonth} onChange={(value) => setForm({ ...form, birthMonth: value })} />
                  <Field label="出生日期" type="number" value={form.birthDay} onChange={(value) => setForm({ ...form, birthDay: value })} />
                  <SelectField
                    label="日期精确度"
                    value={form.birthDatePrecision}
                    onChange={(value) => setForm({ ...form, birthDatePrecision: value as BirthDatePrecision })}
                    options={[
                      ['unknown', '未填写'],
                      ['year_only', '仅年份'],
                      ['month_day', '月日'],
                      ['full_date', '完整日期'],
                    ]}
                  />
                  <p className="text-xs text-muted">填写出生月份和出生日期后，会同步到家族日历。</p>
                </div>
                <Field label="头像占位链接" value={form.portraitUrl} onChange={(value) => setForm({ ...form, portraitUrl: value })} />
                <label className="block">
                  <span className="block text-sm text-charcoal font-medium mb-1.5">家人简介</span>
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    rows={4}
                    className="w-full rounded-xl border-2 border-sand bg-cream px-3 py-2 text-sm focus:outline-none focus:border-pine"
                  />
                </label>
              </>
            )}

            <button
              disabled={saving}
              className="w-full rounded-xl bg-pine text-cream py-3 font-semibold disabled:opacity-60"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <InfoGrid person={person} />
            <Section title="生日提醒">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-charcoal">{getPersonBirthdayLabel(person)}</p>
                  <p className="text-xs text-muted mt-1">
                    {person.birth_month && person.birth_day ? '已具备同步到家族日历的生日信息' : '填写出生月份和出生日期后可生成生日提醒'}
                  </p>
                </div>
                <Link href="/family/calendar" className="shrink-0 rounded-full bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold">
                  家族日历
                </Link>
              </div>
            </Section>
            <Section title="家人简介">
              <p className="text-sm text-muted leading-relaxed">{person.bio || '暂无简介'}</p>
              <p className="text-xs text-muted/70 mt-2">
                头像占位链接：{person.portrait_url || '暂无'}
              </p>
            </Section>
            <Section title="关联关系">
              {relations.length === 0 ? (
                <p className="text-sm text-muted">暂无关联关系</p>
              ) : (
                <div className="space-y-2">
                  {relations.map((item) => (
                    <div key={item.relation.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-charcoal">{relationSummaryLabel(item, person.id)}</span>
                      <span className="text-muted truncate">{item.otherPerson?.display_name ?? '未知成员'}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
            <Section title="家族记忆">
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/family/stories"
                  className="rounded-xl border border-sand/70 bg-cream p-3 text-sm font-medium text-pine"
                >
                  查看相关故事
                </Link>
                <Link
                  href="/family/photos"
                  className="rounded-xl border border-sand/70 bg-cream p-3 text-sm font-medium text-pine"
                >
                  查看相关照片
                </Link>
              </div>
            </Section>
            {person.claim_status === 'unclaimed' && (
              <Link href="/family/invite" className="block text-center rounded-xl bg-pine text-cream py-3 font-semibold">
                邀请认领
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function InfoGrid({ person }: { person: PersonProfile }) {
  const rows: [string, string][] = [
    ['姓名', person.display_name],
    ['姓氏', person.surname || '未填写'],
    ['名字', person.given_name || '未填写'],
    ['性别', GENDER_LABELS[person.gender ?? 'unknown']],
    ['生日信息', getPersonBirthdayLabel(person)],
    ['去世年份', person.death_year ? String(person.death_year) : '无'],
    ['在世状态', LIVING_LABELS[person.living_status]],
    ['认领状态', CLAIM_LABELS[person.claim_status]],
    ['可见范围', VISIBILITY_LABELS[person.visibility]],
  ];

  return (
    <Section title="基础资料">
      <div className="grid grid-cols-2 gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-cream border border-sand/60 p-3">
            <p className="text-xs text-muted mb-1">{label}</p>
            <p className="text-sm font-medium text-charcoal">{value}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-2xl border border-sand/60 shadow-sm p-4">
      <h2 className="text-base font-semibold text-charcoal mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm text-charcoal font-medium mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border-2 border-sand bg-cream px-3 py-2 text-sm focus:outline-none focus:border-pine"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="block">
      <span className="block text-sm text-charcoal font-medium mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border-2 border-sand bg-cream px-3 py-2 text-sm focus:outline-none focus:border-pine"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function CenteredText({ text }: { text: string }) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 text-center">
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}
