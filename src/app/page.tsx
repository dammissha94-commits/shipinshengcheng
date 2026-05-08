import Link from 'next/link';
import { BookOpen, GitBranch, ShieldCheck, Users } from 'lucide-react';

const HIGHLIGHTS = [
  { icon: Users, label: '录入亲属', text: '从本人开始，慢慢补全一家人的档案' },
  { icon: GitBranch, label: '理清亲缘', text: '清楚看到三代关系与家人位置' },
  { icon: BookOpen, label: '留住记忆', text: '把人生经历与家庭故事沉淀下来' },
  { icon: ShieldCheck, label: '家人可见', text: '默认保护家庭隐私和资料边界' },
];

export default function HomePage() {
  return (
    <main className="wj-page flex min-h-screen items-center justify-center px-4 py-10">
      <div className="wj-shell">
        <section className="relative overflow-hidden rounded-[32px] border border-[var(--line-1)] bg-[var(--surface-1)]/86 p-6 shadow-[0_24px_70px_rgba(90,53,36,0.13)] backdrop-blur-xl">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--gold-light)]/18" />
          <div className="absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-[var(--jade)]/12" />
          <div className="absolute right-8 top-20 h-24 w-24 rounded-full border border-[var(--gold-light)]/30" />

          <div className="relative">
            <div className="mb-8 inline-flex items-center rounded-full border border-[var(--surface-2)] bg-[var(--surface-3)] px-3 py-1 text-xs font-medium tracking-[0.18em] text-[var(--walnut-light)]">
              FAMILY MEMORY OS
            </div>

            <div className="mb-7">
              <p className="text-sm font-medium tracking-[0.28em] text-[var(--gold)]">吾家祠堂</p>
              <h1 className="mt-3 text-[34px] font-bold leading-tight tracking-[0.04em] text-[var(--ink-1)]">
                知来处，
                <br />
                明亲缘，留家声
              </h1>
              <p className="mt-4 max-w-[310px] text-[15px] leading-7 text-[var(--ink-3)]">
                创建一座属于自己家的私密数字家堂，理清亲属关系，补充人生经历，收藏家庭记忆，让一家人的来处与故事，代代有迹可循。
              </p>
            </div>

            <div className="relative mb-8 h-40 overflow-hidden rounded-[28px] bg-gradient-to-br from-[var(--walnut)] via-[var(--walnut)] to-[var(--walnut-light)] p-5 text-white shadow-[0_18px_42px_rgba(90,53,36,0.25)]">
              <div className="absolute inset-0 opacity-20">
                <FamilyTreeMark />
              </div>
              <div className="relative flex h-full flex-col items-center justify-center text-center">
                <p className="text-3xl">家</p>
                <p className="mt-2 text-sm text-white/80">每个姓氏，都值得有一座私密数字家堂</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {HIGHLIGHTS.map(({ icon: Icon, label, text }) => (
                <div key={label} className="rounded-3xl border border-[var(--line-1)] bg-white/66 p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-3)] text-[var(--walnut-light)]">
                    <Icon size={18} strokeWidth={1.8} />
                  </div>
                  <p className="text-sm font-semibold text-[var(--ink-1)]">{label}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--ink-3)]">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 space-y-3">
              <Link
                href="/login"
                className="wj-primary flex h-[52px] items-center justify-center rounded-2xl text-base font-semibold transition active:scale-[0.99]"
              >
                进入吾家祠堂
              </Link>
              <p className="text-center text-xs leading-5 text-[var(--ink-3)]">
                不做开放社区，不做支付，不做祭祀化功能。
                <br />
                只服务一个家庭自己的关系、档案与记忆。
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function FamilyTreeMark() {
  const points = [
    { x: 160, y: 156 },
    { x: 86, y: 56 },
    { x: 160, y: 42 },
    { x: 234, y: 56 },
    { x: 56, y: 30 },
    { x: 116, y: 30 },
    { x: 204, y: 30 },
    { x: 264, y: 30 },
  ];

  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" fill="none" aria-hidden>
      <path d="M160 156V108M160 108L86 56M160 108L160 42M160 108L234 56" stroke="#F8E3A0" strokeWidth="2" />
      <path d="M86 56L56 30M86 56L116 30M234 56L204 30M234 56L264 30" stroke="#F8E3A0" strokeWidth="1.4" opacity=".72" />
      {points.map((point, index) => (
        <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r={index === 0 ? 10 : 8} fill="#FFF7D6" opacity=".72" />
      ))}
    </svg>
  );
}
