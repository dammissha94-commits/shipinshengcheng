'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { canManageFamily } from '@/lib/auth/permission-service';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import {
  createPersonProfile,
  createPersonRelation,
  listFamilyPersons,
  listPersonRelations,
} from '@/lib/services/person-service';
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
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    async function loadContext() {
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
        const [profiles, relations] = await Promise.all([
          listFamilyPersons(currentFamily.id),
          listPersonRelations(currentFamily.id),
        ]);
        const allowed = await canManageFamily(currentFamily.id);
        setFamily(currentFamily);
        setSelfProfile(getSelfProfile(profiles, user.id));
        setExistingPersons(mapProfilesToTreePersons(profiles, relations, user.id));
        setCanManage(allowed);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '加载家堂失败');
      } finally {
        setLoading(false);
      }
    }

    loadContext();
  }, [router]);

  const selectedLabel = RELATION_OPTIONS.find((o) => o.value === relation)?.label ?? '';
  const canSubmit = name.trim().length > 0 && family !== null && selfProfile !== null;

  function getRelationInput(newPersonId: string): {
    fromPersonId: string;
    toPersonId: string;
    relationType: RelationType;
  } {
    if (!selfProfile) {
      throw new Error('请先创建数字家堂');
    }

    if (relation === 'father' || relation === 'mother') {
      return { fromPersonId: newPersonId, toPersonId: selfProfile.id, relationType: 'parent_of' };
    }
    if (relation === 'child') {
      return { fromPersonId: selfProfile.id, toPersonId: newPersonId, relationType: 'parent_of' };
    }
    if (relation === 'spouse') {
      return { fromPersonId: selfProfile.id, toPersonId: newPersonId, relationType: 'spouse_of' };
    }
    if (relation === 'sibling') {
      return { fromPersonId: selfProfile.id, toPersonId: newPersonId, relationType: 'sibling_of' };
    }
    return { fromPersonId: newPersonId, toPersonId: selfProfile.id, relationType: 'grandparent_of' };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting || !family) return;

    const alreadyExists =
      relation !== 'child' &&
      relation !== 'sibling' &&
      existingPersons.some((p) => p.relation === relation);

    if (alreadyExists) {
      setError(`已存在${selectedLabel}，如需修改请先删除原有记录。`);
      return;
    }

    try {
      setSubmitting(true);
      const person = await createPersonProfile({
        familyId: family.id,
        surname: family.surname,
        givenName: name.trim(),
        displayName: name.trim(),
        gender,
        birthYear: birthYear ? parseInt(birthYear, 10) : null,
      });
      const relationInput = getRelationInput(person.id);
      await createPersonRelation({
        familyId: family.id,
        ...relationInput,
      });
      router.push('/family/tree');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '保存失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted text-sm">加载中…</p>
      </div>
    );
  }

  if (error && !family) {
    return (
      <div className="flex items-center justify-center py-20 px-4 text-center">
        <p className="text-muted text-sm">{error}</p>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="flex items-center justify-center py-20 px-4 text-center">
        <p className="text-muted text-sm">当前账号无权限添加亲属，请联系家堂管理员。</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Relation select */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1.5">
            关系类型 <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {RELATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setRelation(opt.value);
                  setError('');
                }}
                className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-colors
                  ${relation === opt.value
                    ? 'bg-pine text-cream border-pine'
                    : 'bg-card text-charcoal border-sand hover:border-pine/30'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1.5">
            姓名 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`请输入${selectedLabel}的姓名`}
            maxLength={20}
            className="w-full border-2 border-sand rounded-xl px-4 py-3 text-base
              focus:outline-none focus:border-pine transition-colors bg-card"
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1.5">性别</label>
          <div className="flex gap-3">
            {([['male', '男'], ['female', '女'], ['unknown', '未知']] as const).map(
              ([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setGender(val)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-colors
                    ${gender === val
                      ? 'bg-pine text-cream border-pine'
                      : 'bg-card text-charcoal border-sand hover:border-pine/30'
                    }`}
                >
                  {lbl}
                </button>
              )
            )}
          </div>
        </div>

        {/* Birth year */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1.5">
            出生年份 <span className="text-muted font-normal">（可选）</span>
          </label>
          <select
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            className="w-full border-2 border-sand rounded-xl px-4 py-3 text-base
              focus:outline-none focus:border-pine transition-colors bg-card appearance-none"
          >
            <option value="">不填写</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y} 年</option>
            ))}
          </select>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1.5">
            手机号 <span className="text-muted font-normal">（可选，用于邀请认领）</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="不强制填写"
            maxLength={20}
            className="w-full border-2 border-sand rounded-xl px-4 py-3 text-base
              focus:outline-none focus:border-pine transition-colors bg-card"
          />
        </div>

        <p className="text-xs text-muted leading-relaxed bg-sand/50 rounded-xl p-3">
          录入的亲属信息仅家族内部可见。未认领成员将显示为待认领状态，信息不对外公开。
        </p>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className={`w-full py-4 rounded-xl text-base font-semibold transition-all
            ${canSubmit
              ? 'bg-pine text-cream shadow-sm hover:bg-pine-light active:scale-[0.98]'
              : 'bg-sand text-muted cursor-not-allowed'
            }`}
        >
          {submitting ? '保存中…' : '保存并返回家谱'}
        </button>
      </form>
    </div>
  );
}

export default function NewRelativePage() {
  return (
    <div className="min-h-screen bg-cream">
      <AppHeader title="添加家庭成员" backHref="/family/tree" />
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <p className="text-muted text-sm">加载中…</p>
          </div>
        }
      >
        <NewRelativeForm />
      </Suspense>
    </div>
  );
}
