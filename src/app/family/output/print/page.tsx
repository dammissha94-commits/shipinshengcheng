'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/auth-service';
import { currentLoginRedirectPath } from '@/lib/auth/redirect';
import { hasSupabaseConfig } from '@/lib/supabase/client';
import { getCurrentFamilySpace } from '@/lib/services/family-service';
import {
  getFamilyPrintOutputData,
  type FamilyPrintOutputEvent,
  type FamilyPrintOutputPerson,
  type FamilyPrintOutputRelation,
  type FamilyPrintOutputStory,
} from '@/lib/services/output-service';
import { solarToLunar } from '@/lib/date/lunar';
import type { FamilySpace } from '@/types/domain';

export default function FamilyPrintPage() {
  const router = useRouter();
  const [family, setFamily] = useState<FamilySpace | null>(null);
  const [persons, setPersons] = useState<FamilyPrintOutputPerson[]>([]);
  const [relations, setRelations] = useState<FamilyPrintOutputRelation[]>([]);
  const [stories, setStories] = useState<FamilyPrintOutputStory[]>([]);
  const [events, setEvents] = useState<FamilyPrintOutputEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        const outputData = await getFamilyPrintOutputData(currentFamily.id);
        setFamily(currentFamily);
        setPersons(outputData.persons);
        setRelations(outputData.relations);
        setStories(outputData.stories);
        setEvents(outputData.events);
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载家堂档案失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) return <CenteredText text="加载家堂档案中..." />;
  if (error || !family) return <CenteredText text={error || '请先创建数字家堂'} />;

  const claimedCount = persons.filter((person) => person.claim_status === 'claimed').length;
  const today = new Date();
  const lunar = solarToLunar(today);
  const dateLabel = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 · ${lunar.monthLabel}${lunar.dayLabel}`;

  return (
    <div className="print-root min-h-screen bg-[#F5EBD7] py-8">
      <div className="no-print mx-auto mb-6 flex max-w-[760px] items-center justify-between px-4">
        <Link href="/family/output" className="flex min-h-[44px] items-center gap-2 rounded-full border border-[#E7D9C9] bg-white/86 px-4 text-[14px] font-medium text-[#5A3524] shadow-[0_8px_18px_rgba(90,53,36,0.06)]">
          <ArrowLeft size={16} /> 返回
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex min-h-[48px] items-center gap-2 rounded-full bg-[#5A3825] px-5 text-[14px] font-semibold text-white shadow-[0_10px_22px_rgba(90,53,36,0.18)] transition active:scale-[0.97]"
        >
          <Printer size={16} /> 打印 / 另存为 PDF
        </button>
      </div>

      <article className="print-page mx-auto max-w-[760px] bg-white px-12 py-14 text-[#2A1D16] shadow-[0_24px_56px_rgba(90,53,36,0.16)] print:shadow-none">
        <header className="mb-12 border-b-4 border-[#5A3825] pb-10 text-center">
          <p className="mb-3 text-[12px] tracking-[0.3em] text-[#78675B]">FAMILY MEMORY OS</p>
          <h1 className="font-serif text-[44px] font-black leading-tight tracking-[0.08em]">{family.surname}氏家堂 · 档案</h1>
          <p className="mt-3 text-[15px] text-[#5A3524]">{family.displayName ?? family.display_name}</p>
          <p className="mt-6 text-[13px] tracking-[0.18em] text-[#78675B]">导出于 {dateLabel}</p>

          <div className="mx-auto mt-10 grid w-full max-w-[520px] grid-cols-4 gap-4">
            <Stat label="家人" value={persons.length} unit="位" />
            <Stat label="已认领" value={claimedCount} unit="位" />
            <Stat label="故事" value={stories.length} unit="篇" />
            <Stat label="家庭节点" value={events.length} unit="项" />
          </div>
        </header>

        <Section title="一、家人列表" subtitle={`共 ${persons.length} 位`}>
          {persons.length === 0 ? (
            <p className="text-sm text-[#78675B]">暂无家人档案</p>
          ) : (
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr className="border-b-2 border-[#D4BB91]">
                  <Th>姓名</Th>
                  <Th>性别</Th>
                  <Th>出生年</Th>
                  <Th>状态</Th>
                  <Th>认领</Th>
                </tr>
              </thead>
              <tbody>
                {persons.map((person) => (
                  <tr key={person.id} className="border-b border-[#E7D9C9]">
                    <Td>{person.display_name}</Td>
                    <Td>{person.gender === 'male' ? '男' : person.gender === 'female' ? '女' : '未填'}</Td>
                    <Td>{person.birth_year ?? '未填'}</Td>
                    <Td>{person.living_status === 'alive' ? '健在' : person.living_status === 'deceased' ? '离世' : '未填写'}</Td>
                    <Td>{person.claim_status === 'claimed' ? '已认领' : '待认领'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="二、家族关系" subtitle={`共 ${relations.length} 条`}>
          {relations.length === 0 ? (
            <p className="text-sm text-[#78675B]">暂无关系数据</p>
          ) : (
            <ul className="space-y-1.5 text-[14px]">
              {relations.slice(0, 100).map((relation) => {
                const from = persons.find((person) => person.id === relation.from_person_id)?.display_name ?? '未知家人';
                const to = persons.find((person) => person.id === relation.to_person_id)?.display_name ?? '未知家人';
                const labels: Record<string, string> = {
                  parent_of: '是对方的父母',
                  child_of: '是对方的子女',
                  spouse_of: '是对方的配偶',
                  sibling_of: '是对方的兄弟姐妹',
                  grandparent_of: '是对方的祖辈',
                };
                return (
                  <li key={relation.id} className="border-b border-dashed border-[#E7D9C9] py-1.5">
                    <span className="font-semibold">{from}</span> {labels[relation.relation_type] ?? relation.relation_type}{' '}
                    <span className="font-semibold">{to}</span>
                  </li>
                );
              })}
              {relations.length > 100 && <li className="pt-2 text-[12px] text-[#78675B]">仅显示前 100 条，共 {relations.length} 条。</li>}
            </ul>
          )}
        </Section>

        <Section title="三、家族故事" subtitle={`共 ${stories.length} 篇`}>
          {stories.length === 0 ? (
            <p className="text-sm text-[#78675B]">暂无家族故事</p>
          ) : (
            <div className="space-y-6">
              {stories.map((story) => (
                <article key={story.id} className="break-inside-avoid border-l-4 border-[#B8924E] pl-4">
                  <header className="mb-2">
                    <p className="text-[11px] tracking-[0.16em] text-[#78675B]">{story.story_year ? `${story.story_year} 年` : '岁月里'}</p>
                    <h3 className="font-serif text-[20px] font-bold">{story.title}</h3>
                  </header>
                  {story.content && <p className="whitespace-pre-line text-[14px] leading-7 text-[#5A3524]">{story.content}</p>}
                </article>
              ))}
            </div>
          )}
        </Section>

        <Section title="四、家庭节点" subtitle={`共 ${events.length} 项`}>
          {events.length === 0 ? (
            <p className="text-sm text-[#78675B]">暂无家庭节点</p>
          ) : (
            <ul className="space-y-2 text-[14px]">
              {events.map((event) => (
                <li key={event.id} className="flex items-start gap-3 border-b border-dashed border-[#E7D9C9] py-2">
                  <span className="w-[92px] shrink-0 font-mono text-[#78675B]">{event.event_date ?? '未填'}</span>
                  <span className="flex-1">{event.title}</span>
                  <span className="text-[12px] text-[#78675B]">{event.event_type}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <footer className="mt-16 border-t border-[#E7D9C9] pt-8 text-center">
          <p className="text-[13px] tracking-[0.18em] text-[#78675B]">吾家祠堂</p>
          <p className="mt-2 text-[12px] text-[#78675B]">{dateLabel} · 由数字家堂自动生成</p>
        </footer>
      </article>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1.5cm;
          }
          body {
            background: #fff !important;
          }
          body::before {
            display: none !important;
          }
          .no-print {
            display: none !important;
          }
          .print-page {
            box-shadow: none !important;
            max-width: none !important;
            padding: 0 !important;
            page-break-inside: auto;
          }
          .break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

function CenteredText({ text }: { text: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5EBD7] px-4 text-center">
      <p className="rounded-[15px] border border-[#E7D9C9] bg-white/86 px-4 py-5 text-sm text-[#78675B] shadow-[0_10px_28px_rgba(90,53,36,0.06)]">{text}</p>
    </main>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 break-inside-avoid">
      <header className="mb-4 flex items-baseline justify-between border-b border-[#E7D9C9] pb-2">
        <h2 className="font-serif text-[22px] font-bold text-[#2A1D16]">{title}</h2>
        {subtitle && <span className="text-[12px] text-[#78675B]">{subtitle}</span>}
      </header>
      {children}
    </section>
  );
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="text-center">
      <p className="font-serif text-[28px] font-bold leading-none text-[#2A1D16]">{value}</p>
      <p className="mt-1 text-[12px] text-[#78675B]">{label} · {unit}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="py-2 text-left text-[12px] font-semibold tracking-[0.1em] text-[#78675B]">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="py-2 text-[14px] text-[#2A1D16]">{children}</td>;
}
