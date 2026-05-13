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
import { MobilePage, MobileStatusBar, MobileTopBar } from '@/components/wujia/MobileChrome';
import { WjCardHeader, WjHeroPanel, WjPaperCard, WjScreenContent, WjSoftNote } from '@/components/wujia/MobileDesignSystem';
import { WjButton, WjFormRow, WjInput, WjSelect } from '@/components/wujia/WjForm';

const YEARS = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i - 5);

const RELATION_LABELS: Partial<Record<Relation, string>> = {
  father: '父亲',
  mother: '母亲',
  spouse: '配偶',
  child: '子女',
  sibling: '兄弟姐妹',
  grandfather_paternal: '爷爷',
  grandmother_paternal: '奶奶',
  grandfather_maternal: '外公',
  grandmother_maternal: '外婆',
};

function normalizeRelationParam(value: string | null): Relation {
  return value && RELATION_OPTIONS.some((option) => option.value === value)
    ? (value as Relation)
    : 'father';
}

function defaultGenderForRelation(value: Relation): Gender {
  if (
    value === 'mother' ||
    value === 'grandmother_paternal' ||
    value === 'grandmother_maternal'
  ) {
    return 'female';
  }
  if (
    value === 'father' ||
    value === 'grandfather_paternal' ||
    value === 'grandfather_maternal'
  ) {
    return 'male';
  }
  return 'unknown';
}

function NewRelativeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [selfProfile, setSelfProfile] = useState<PersonProfile | null>(null);
  const [existingPersons, setExistingPersons] = useState<ReturnType<typeof mapProfilesToTreePersons>>([]);
  const [relation, setRelation] = useState<Relation>(() => normalizeRelationParam(searchParams.get('relation')));
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>(() => defaultGenderForRelation(normalizeRelationParam(searchParams.get('relation'))));
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

  const selectedLabel = RELATION_LABELS[relation] ?? RELATION_OPTIONS.find((o) => o.value === relation)?.label ?? '亲属';
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
    if (alreadyExists) {
      setError(`已存在${selectedLabel}，如需修改请先处理原有记录。`);
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      const person = await createPersonProfile({
        familyId: family.id,
        surname: family.surname,
        givenName: name.trim(),
        displayName: name.trim(),
        gender,
        birthYear: birthYear ? parseInt(birthYear, 10) : null,
      });
      await createPersonRelation({ familyId: family.id, ...getRelationInput(person.id) });
      router.push('/family/members');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '保存失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <CenteredText text="加载中..." />;
  if (error && !family) return <CenteredText text={error} />;
  if (!canManage) return <CenteredText text="当前账号暂无权限添加亲属，请联系家堂管理员。" />;

  return (
    <WjScreenContent>
      <WjHeroPanel
        eyebrow="ADD FAMILY MEMBER"
        title="添加家人"
        description="先选择与你的关系，再填写姓名与基础信息。信息不足时可以保守填写，后续由家人认领补充。"
      />

      <WjPaperCard className="p-4">
        <p className="text-sm font-semibold text-[#2A1D16]">建议按这个顺序录入</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            ['1', '先加直系', '父母、配偶、子女'],
            ['2', '再补旁系', '兄弟姐妹等'],
            ['3', '最后邀请', '由本人认领完善'],
          ].map(([step, title, desc]) => (
            <div key={step} className="rounded-2xl border border-[#E7D9C9] bg-[#FBF4E8] px-2 py-3">
              <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-[#5A3825] text-[11px] font-semibold text-white">{step}</span>
              <p className="mt-2 text-xs font-semibold text-[#5A3524]">{title}</p>
              <p className="mt-1 text-[10px] leading-4 text-[#8A7465]">{desc}</p>
            </div>
          ))}
        </div>
      </WjPaperCard>

      <WjPaperCard className="overflow-hidden">
        <WjCardHeader title="选择关系" description="选择你要添加的家人与自己的关系。" />
        <div className="grid grid-cols-3 gap-2 p-5">
          {RELATION_OPTIONS.map((option) => {
            const label = RELATION_LABELS[option.value] ?? option.label;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  const nextRelation = option.value;
                  setRelation(nextRelation);
                  setGender(defaultGenderForRelation(nextRelation));
                  setError('');
                }}
                className={`min-h-[44px] rounded-[14px] border-2 text-sm font-medium transition ${
                  relation === option.value
                    ? 'border-[#5A3825] bg-[#5A3825] text-white shadow-[0_10px_22px_rgba(90,53,36,0.18)]'
                    : 'border-[#E7D9C9] bg-white text-[#5A3524] hover:border-[#8B5A3C]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </WjPaperCard>

      <form onSubmit={handleSubmit}>
        <WjPaperCard className="overflow-hidden">
          <WjCardHeader
            title={`填写${selectedLabel}资料`}
            description="先保存基础节点，后续可以邀请本人认领并补充完整档案。"
            action={<UserPlus size={18} className="text-[#9B6A37]" />}
          />

          <div className="space-y-4 px-5 py-5">
            <WjFormRow label="姓名" required>
              <WjInput value={name} onChange={(e) => setName(e.target.value)} placeholder={`请输入${selectedLabel}的姓名`} maxLength={20} />
            </WjFormRow>
            <WjFormRow label="性别">
              <div className="flex gap-3">
                {([['male', '男'], ['female', '女'], ['unknown', '未知']] as const).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setGender(v)}
                    className={`flex-1 rounded-[14px] border-2 py-2.5 text-sm font-medium transition ${
                      gender === v
                        ? 'border-[#5A3825] bg-[#5A3825] text-white shadow-[0_10px_22px_rgba(90,53,36,0.18)]'
                        : 'border-[#E7D9C9] bg-white text-[#5A3524] hover:border-[#8B5A3C]'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </WjFormRow>
            <WjFormRow label="出生年份" hint="可选">
              <WjSelect value={birthYear} onChange={(e) => setBirthYear(e.target.value)}>
                <option value="">不填写</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y} 年</option>
                ))}
              </WjSelect>
            </WjFormRow>
          </div>

          <div className="space-y-4 border-t border-[#EEE3D6] px-5 py-4">
            <WjSoftNote>添加亲属后，可前往邀请页面生成链接，发给家人完成认领。</WjSoftNote>
            {error && <p className="rounded-xl bg-danger-light px-4 py-2.5 text-sm text-danger">{error}</p>}
            <WjButton type="submit" variant="primary" size="lg" disabled={!canSubmit} loading={submitting} className="w-full">
              保存并返回成员列表
            </WjButton>
          </div>
        </WjPaperCard>
      </form>

      <WjPaperCard className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1E5D6] text-[#9B6A37]">
            <Link2 size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#2A1D16]">邀请认领</p>
              <p className="mt-1 text-[12px] leading-5 text-[#78675B]">保存节点后，把认领链接发给家人，让真实本人补充档案、照片和家庭记忆。</p>
            <Link href="/family/invite" className="mt-2 inline-flex min-h-[44px] items-center text-sm font-medium text-[#5A3825] hover:text-[#8B5A3C]">
              前往邀请认领 &rarr;
            </Link>
          </div>
        </div>
      </WjPaperCard>
    </WjScreenContent>
  );
}

function CenteredText({ text }: { text: string }) {
  return (
    <div className="relative z-10 flex min-h-[60vh] items-center justify-center px-5 text-center">
      <p className="rounded-[15px] border border-[#E7D9C9] bg-white/82 px-4 py-5 text-sm text-[#78675B] shadow-[0_10px_28px_rgba(90,53,36,0.06)]">{text}</p>
    </div>
  );
}

export default function NewRelativePage() {
  return (
    <MobilePage>
      <MobileStatusBar />
      <MobileTopBar title="添加家人" backHref="/family/tree" />
      <Suspense fallback={<CenteredText text="加载中..." />}>
        <NewRelativeForm />
      </Suspense>
    </MobilePage>
  );
}
