'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Link2, UserPlus } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { canManageFamily } from '@/lib/auth/permission-service';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import { createPersonProfile, createPersonRelation, listFamilyPersons, listPersonRelations } from '@/lib/services/person-service';
import { getSelfProfile, mapProfilesToTreePersons } from '@/lib/family-view';
import type { FamilySpace, Gender, PersonProfile, Relation, RelationType } from '@/types/domain';
import { RELATION_OPTIONS } from '@/types/domain';
import AppHeader from '@/components/AppHeader';

const YEARS = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i - 5);

function NewRelativeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [selfProfile, setSelfProfile] = useState<PersonProfile | null>(null);
  const [existingPersons, setExistingPersons] = useState<ReturnType<typeof mapProfilesToTreePersons>>([]);
  const [relation, setRelation] = useState<Relation>(() => {
    const rel = searchParams.get('relation') as Relation | null;
    return rel && RELATION_OPTIONS.some((o) => o.value === rel) ? rel : 'father';
  });
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [birthYear, setBirthYear] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    async function loadContext() {
      if (!hasSupabaseConfig()) { setError('尚未配置 Supabase 环境变量，请先配置 .env.local'); setLoading(false); return; }
      try {
        const user = await getCurrentUser();
        if (!user) { router.replace(currentLoginRedirectPath()); return; }
        const currentFamily = await getCurrentFamilySpace(undefined, user);
        if (!currentFamily) { router.replace('/create'); return; }
        const [profiles, relations, allowed] = await Promise.all([
          listFamilyPersons(currentFamily.id),
          listPersonRelations(currentFamily.id),
          canManageFamily(currentFamily.id),
        ]);
        setFamily(currentFamily);
        setSelfProfile(getSelfProfile(profiles, user.id));
        setExistingPersons(mapProfilesToTreePersons(profiles, relations, user.id));
        setCanManage(allowed);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载家堂失败');
      } finally { setLoading(false); }
    }
    loadContext();
  }, [router]);

  const selectedLabel = RELATION_OPTIONS.find((o) => o.value === relation)?.label ?? '';
  const canSubmit = name.trim().length > 0 && family !== null && selfProfile !== null;

  function getRelationInput(newPersonId: string): { fromPersonId: string; toPersonId: string; relationType: RelationType } {
    if (!selfProfile) throw new Error('请先创建数字家堂');
    if (relation === 'father' || relation === 'mother') return { fromPersonId: newPersonId, toPersonId: selfProfile.id, relationType: 'parent_of' };
    if (relation === 'child') return { fromPersonId: selfProfile.id, toPersonId: newPersonId, relationType: 'parent_of' };
    if (relation === 'spouse') return { fromPersonId: selfProfile.id, toPersonId: newPersonId, relationType: 'spouse_of' };
    if (relation === 'sibling') return { fromPersonId: selfProfile.id, toPersonId: newPersonId, relationType: 'sibling_of' };
    return { fromPersonId: newPersonId, toPersonId: selfProfile.id, relationType: 'grandparent_of' };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit || submitting || !family) return;
    const alreadyExists = relation !== 'child' && relation !== 'sibling' && existingPersons.some((p) => p.relation === relation);
    if (alreadyExists) { setError(`已存在${selectedLabel}，如需修改请先处理原有记录。`); return; }
    try {
      setSubmitting(true);
      const person = await createPersonProfile({ familyId: family.id, surname: family.surname, givenName: name.trim(), displayName: name.trim(), gender, birthYear: birthYear ? parseInt(birthYear, 10) : null });
      await createPersonRelation({ familyId: family.id, ...getRelationInput(person.id) });
      router.push('/family/tree');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '保存失败，请稍后重试');
    } finally { setSubmitting(false); }
  }

  if (loading) return <CenteredText text="加载中..." />;
  if (error && !family) return <CenteredText text={error} />;
  if (!canManage) return <CenteredText text="当前账号无权限添加亲属，请联系家堂管理员。" />;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
      {/* Relation selector */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-5 py-4">
          <h2 className="text-base font-semibold text-stone-800">选择关系</h2>
          <p className="mt-0.5 text-sm text-stone-500">选择你要添加的家人与你的关系</p>
        </div>
        <div className="grid grid-cols-3 gap-2 p-5">
          {RELATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { setRelation(option.value); setError(''); }}
              className={`rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${
                relation === option.value
                  ? 'border-emerald-950 bg-emerald-950 text-white shadow-sm'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 px-5 py-4">
            <h2 className="text-base font-semibold text-stone-800">
              <UserPlus size={16} className="inline mr-2 text-emerald-700" />
              填写{selectedLabel}的资料
            </h2>
          </div>
          <div className="space-y-4 px-5 py-5">
            <label className="block">
              <span className="block text-sm font-medium text-stone-700 mb-1.5">姓名 <span className="text-red-400">*</span></span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={`请输入${selectedLabel}的姓名`} maxLength={20}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all" />
            </label>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">性别</label>
              <div className="flex gap-3">
                {([['male','男'],['female','女'],['unknown','未知']] as const).map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setGender(v)}
                    className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-medium transition-all ${
                      gender === v ? 'border-emerald-950 bg-emerald-950 text-white shadow-sm' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'
                    }`}>{l}</button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="block text-sm font-medium text-stone-700 mb-1.5">出生年份 <span className="text-stone-400 font-normal">（可选）</span></span>
              <select value={birthYear} onChange={(e) => setBirthYear(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all appearance-none">
                <option value="">不填写</option>
                {YEARS.map((y) => <option key={y} value={y}>{y} 年</option>)}
              </select>
            </label>
          </div>
          <div className="border-t border-stone-100 px-5 py-4 space-y-4">
            <p className="text-xs text-stone-400 leading-relaxed">添加亲属后，可前往邀请页面生成链接，发给家人完成认领。</p>
            {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={!canSubmit || submitting}
              className="w-full h-12 rounded-xl bg-emerald-950 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-900 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]">
              {submitting ? '保存中...' : '保存并返回家谱'}
            </button>
          </div>
        </div>
      </form>

      {/* Invite hint */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Link2 size={17} />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800">邀请认领</p>
            <p className="mt-1 text-xs text-stone-500">添加亲属后，前往邀请页面生成链接发给家人完成认领。</p>
            <Link href="/family/invite" className="mt-2 inline-flex text-sm font-medium text-amber-700 hover:text-amber-800">前往邀请认领 &rarr;</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function CenteredText({ text }: { text: string }) {
  return <div className="flex items-center justify-center px-4 py-20 text-center"><p className="text-sm text-stone-500">{text}</p></div>;
}

export default function NewRelativePage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <AppHeader title="添加家人" backHref="/family/tree" />
      <Suspense fallback={<CenteredText text="加载中..." />}>
        <NewRelativeForm />
      </Suspense>
    </div>
  );
}
