'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Link2 } from 'lucide-react';
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
import { Button, Card, Input, PageShell } from '@/components/ui';
import { cn } from '@/lib/utils';

const YEARS = Array.from({ length: 100 }, (_, index) => new Date().getFullYear() - index - 5);

function NewRelativeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [selfProfile, setSelfProfile] = useState<PersonProfile | null>(null);
  const [existingPersons, setExistingPersons] = useState<ReturnType<typeof mapProfilesToTreePersons>>([]);
  const [relation, setRelation] = useState<Relation>(() => {
    const rel = searchParams.get('relation') as Relation | null;
    return rel && RELATION_OPTIONS.some((option) => option.value === rel) ? rel : 'father';
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
      } finally {
        setLoading(false);
      }
    }

    loadContext();
  }, [router]);

  const selectedLabel = RELATION_OPTIONS.find((option) => option.value === relation)?.label ?? '';
  const canSubmit = name.trim().length > 0 && family !== null && selfProfile !== null;

  function getRelationInput(newPersonId: string): {
    fromPersonId: string;
    toPersonId: string;
    relationType: RelationType;
  } {
    if (!selfProfile) throw new Error('请先创建数字家堂');

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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit || submitting || !family) return;

    const alreadyExists =
      relation !== 'child' &&
      relation !== 'sibling' &&
      existingPersons.some((person) => person.relation === relation);

    if (alreadyExists) {
      setError(`已存在${selectedLabel}，如需修改请先处理原有记录。`);
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
      await createPersonRelation({
        familyId: family.id,
        ...getRelationInput(person.id),
      });
      router.push('/family/tree');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '保存失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <CenteredText text="加载中..." />;
  if (error && !family) return <CenteredText text={error} />;
  if (!canManage) return <CenteredText text="当前账号无权限添加亲属，请联系家堂管理员。" />;

  return (
    <PageShell className="min-h-0" contentClassName="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="p-4">
          <label className="mb-2 block text-sm font-medium text-charcoal">
            关系 <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {RELATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setRelation(option.value);
                  setError('');
                }}
                className={cn(
                  'rounded-xl border-2 py-2.5 text-sm font-medium transition-colors',
                  relation === option.value
                    ? 'border-pine bg-pine text-cream'
                    : 'border-sand bg-card text-charcoal hover:border-pine/30'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-charcoal">
              姓名 <span className="text-red-400">*</span>
            </span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={`请输入${selectedLabel}的姓名`}
              maxLength={20}
              className="bg-card"
            />
          </label>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-charcoal">性别</label>
            <div className="flex gap-3">
              {([
                ['male', '男'],
                ['female', '女'],
                ['unknown', '未知'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGender(value)}
                  className={cn(
                    'flex-1 rounded-xl border-2 py-3 text-sm font-medium transition-colors',
                    gender === value
                      ? 'border-pine bg-pine text-cream'
                      : 'border-sand bg-card text-charcoal hover:border-pine/30'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-charcoal">
              出生年份 <span className="font-normal text-muted">（可选）</span>
            </span>
            <select
              value={birthYear}
              onChange={(event) => setBirthYear(event.target.value)}
              className="w-full appearance-none rounded-xl border-2 border-sand bg-card px-4 py-3 text-base transition-colors focus:border-pine focus:outline-none"
            >
              <option value="">不填写</option>
              {YEARS.map((year) => (
                <option key={year} value={year}>
                  {year} 年
                </option>
              ))}
            </select>
          </label>
        </Card>

        <Card className="border-gold/25 bg-gold/10 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
              <Link2 size={17} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-charcoal">邀请认领在专门页面生成</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                添加亲属后，可前往“邀请认领”页面生成链接，发给家人完成认领和档案补充。
              </p>
              <Link href="/family/invite" className="mt-3 inline-flex text-xs font-semibold text-pine">
                前往邀请认领
              </Link>
            </div>
          </div>
        </Card>

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-500">{error}</p>}

        <Button type="submit" disabled={!canSubmit || submitting} fullWidth size="lg">
          {submitting ? '保存中...' : '保存并返回家谱'}
        </Button>
      </form>
    </PageShell>
  );
}

function CenteredText({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center px-4 py-20 text-center">
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}

export default function NewRelativePage() {
  return (
    <div className="min-h-screen bg-cream">
      <AppHeader title="添加家人成员" backHref="/family/tree" />
      <Suspense fallback={<CenteredText text="加载中..." />}>
        <NewRelativeForm />
      </Suspense>
    </div>
  );
}
