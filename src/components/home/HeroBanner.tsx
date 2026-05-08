import HeroTreeIllustration from './HeroTreeIllustration';

interface HeroBannerProps {
  /** 主语 — 通常为家堂 slogan */
  title?: string;
  /** 第二行 slogan（可选）*/
  subtitle?: string;
}

/**
 * HeroBanner — 数字家堂首页主标语横幅
 * 暖纸面 + 金线分隔 + 右上角树形装饰。
 */
export default function HeroBanner({
  title = '知来处，明亲缘，',
  subtitle = '让家声代代有迹可循',
}: HeroBannerProps) {
  return (
    <section className="relative z-10 mt-6 overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-3)] px-6 py-8 shadow-[inset_0_0_0_1px_rgba(139,90,60,0.07)]">
      <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(ellipse_at_15%_100%,rgba(170,151,107,0.20),transparent_48%),radial-gradient(ellipse_at_78%_100%,rgba(111,138,121,0.24),transparent_48%)]" />
      <div className="absolute right-1 top-4 h-[170px] w-[210px] text-[var(--gold)]">
        <HeroTreeIllustration />
      </div>
      <div className="relative z-10 max-w-[210px]">
        <p className="font-serif text-[28px] font-black leading-[1.7] tracking-[0.06em] text-[var(--ink-2)]">
          {title}
          <br />
          {subtitle}
        </p>
        <div className="mt-6 h-1 w-16 rounded-full bg-[var(--gold)]" />
      </div>
    </section>
  );
}
