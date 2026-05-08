/**
 * today-focus.ts — 首页 TodayHero 的数据聚合器
 *
 * 输入：当前用户、家堂、亲属、家庭节点
 * 输出：
 *   - greeting: 时间感问候（早安/午安/晚安/夜深）
 *   - selfName: 本人姓名（用于自报家门）
 *   - primary: 今日最值得关注的一件事（按优先级）
 *   - secondary: 备选 2-3 条（用于副位展示）
 *   - markers: 节气节日徽标列表（直接给 UI）
 *
 * 优先级（高 → 低）：
 *   1. 今日是某位家人生日
 *   2. 今日是家庭节点（纪念日/聚会/事项）
 *   3. 今日是传统农历节日（春节/中秋/...）
 *   4. 今日是节气
 *   5. 7 天内即将到来的生日
 *   6. 7 天内即将到来的家庭节点
 *   7. 今日是公历纪念日（国庆/元旦/...）
 *   8. fallback: 资料完善度提示
 */

import type { FamilyCalendarEvent, FamilySpace, PersonProfile } from '@/types/domain';
import {
  enrichCalendarEventWithOccurrence,
  sortEventsByNextOccurrence,
} from '@/lib/services/calendar-service';
import { getDateMarkers, type FestivalInfo } from '@/lib/date/lunar';

export type FocusType =
  | 'birthday-today'
  | 'birthday-upcoming'
  | 'event-today'
  | 'event-upcoming'
  | 'festival'
  | 'solarTerm'
  | 'solarHoliday'
  | 'progress';

export interface FocusItem {
  type: FocusType;
  title: string;
  subtitle?: string;
  /** 还有几天发生（≤0 表示今天） */
  daysUntil?: number;
  /** 跳转目标 */
  href?: string;
  /** 一个 emoji 或简短装饰（可选） */
  hint?: string;
}

export interface TodayFocus {
  greeting: string;
  selfName: string | null;
  primary: FocusItem;
  secondary: FocusItem[];
  markers: FestivalInfo[];
}

/* ---------- 工具 ---------- */

function timeOfDayGreeting(date: Date): string {
  const h = date.getHours();
  if (h < 5) return '夜深了';
  if (h < 11) return '早安';
  if (h < 14) return '午安';
  if (h < 18) return '下午好';
  if (h < 22) return '晚上好';
  return '夜深了';
}

/** 计算从 today 到 (month, day) 的剩余天数（0..364） */
function daysToAnnualDate(today: Date, month: number, day: number): number {
  const y = today.getFullYear();
  let target = new Date(y, month - 1, day);
  if (target.getTime() < new Date(y, today.getMonth(), today.getDate()).getTime()) {
    target = new Date(y + 1, month - 1, day);
  }
  const diff = target.getTime() - new Date(y, today.getMonth(), today.getDate()).getTime();
  return Math.round(diff / 86400000);
}

function ageOnDate(birthYear: number, today: Date): number {
  return today.getFullYear() - birthYear;
}

/* ---------- 主聚合器 ---------- */

interface ComputeArgs {
  /** 当前用户 ID（用于识别"本人"） */
  currentUserId: string;
  /** 当前家堂 */
  family: FamilySpace;
  /** 家人列表 */
  profiles: PersonProfile[];
  /** 家庭节点列表 */
  events: FamilyCalendarEvent[];
  /** 故事数（用于 fallback） */
  storiesCount: number;
  /** 今天（默认 new Date()） */
  today?: Date;
}

export function getTodayFocus({
  currentUserId,
  family,
  profiles,
  events,
  storiesCount,
  today = new Date(),
}: ComputeArgs): TodayFocus {
  // 1. 自报家门
  const selfPerson =
    profiles.find((p) => p.bound_user_id === currentUserId && p.claim_status === 'claimed') ??
    profiles.find((p) => p.bound_user_id === currentUserId) ??
    null;
  const selfName = selfPerson?.display_name ?? null;

  const greeting = timeOfDayGreeting(today);
  const markers = getDateMarkers(today);

  // 2. 今日生日 / 即将生日
  const m = today.getMonth() + 1;
  const d = today.getDate();
  const birthdaysToday = profiles
    .filter((p) => p.birth_month === m && p.birth_day === d && p.living_status !== 'deceased')
    .map((p) => makeBirthdayFocus(p, today, 0));

  const upcomingBirthdays = profiles
    .filter(
      (p) =>
        p.birth_month != null &&
        p.birth_day != null &&
        p.living_status !== 'deceased' &&
        !(p.birth_month === m && p.birth_day === d)
    )
    .map((p) => {
      const days = daysToAnnualDate(today, p.birth_month!, p.birth_day!);
      return { p, days };
    })
    .filter(({ days }) => days > 0 && days <= 14)
    .sort((a, b) => a.days - b.days)
    .map(({ p, days }) => makeBirthdayFocus(p, today, days));

  // 3. 今日 / 即将的家庭节点
  const sortedEvents = sortEventsByNextOccurrence(
    events.filter((e) => e.status !== 'archived'),
    today
  );
  const eventsToday: FocusItem[] = [];
  const eventsUpcoming: FocusItem[] = [];
  for (const ev of sortedEvents) {
    const enriched = enrichCalendarEventWithOccurrence(ev, today);
    const days = enriched.daysUntil;
    if (days === null) continue;
    const item = makeEventFocus(ev, days);
    if (days === 0) eventsToday.push(item);
    else if (days > 0 && days <= 14) eventsUpcoming.push(item);
  }

  // 4. 节日 / 节气 focus 候选
  const festivalFocus = markers
    .filter((mk) => mk.source === 'lunar')
    .map((mk) => makeFestivalFocus(mk));
  const solarTermFocus = markers
    .filter((mk) => mk.source === 'solarTerm')
    .map((mk) => makeSolarTermFocus(mk));
  const solarHolidayFocus = markers
    .filter((mk) => mk.source === 'solar')
    .map((mk) => makeSolarHolidayFocus(mk));

  // 5. fallback：资料完善度
  const progressFocus = makeProgressFocus(family, profiles, storiesCount);

  // 优先级合并
  const ordered: FocusItem[] = [
    ...birthdaysToday,
    ...eventsToday,
    ...festivalFocus,
    ...solarTermFocus,
    ...upcomingBirthdays.slice(0, 3),
    ...eventsUpcoming.slice(0, 3),
    ...solarHolidayFocus,
    progressFocus,
  ];

  const [primary, ...rest] = ordered;
  return {
    greeting,
    selfName,
    primary,
    secondary: rest.slice(0, 3),
    markers,
  };
}

/* ---------- focus 工厂 ---------- */

function makeBirthdayFocus(p: PersonProfile, today: Date, daysUntil: number): FocusItem {
  const ageThisYear = p.birth_year ? ageOnDate(p.birth_year, today) + (daysUntil > 0 ? 0 : 0) : null;
  const ageLabel = ageThisYear !== null ? ` · ${ageThisYear} 岁` : '';
  return {
    type: daysUntil === 0 ? 'birthday-today' : 'birthday-upcoming',
    title: daysUntil === 0 ? `今天是 ${p.display_name} 生日` : `${p.display_name} 生日`,
    subtitle:
      daysUntil === 0
        ? `${ageLabel.replace(' · ', '')}，记得送上家人的祝福`
        : `还有 ${daysUntil} 天${ageLabel}`,
    daysUntil,
    href: `/family/members/${p.id}`,
    hint: '🎂',
  };
}

function makeEventFocus(ev: FamilyCalendarEvent, daysUntil: number): FocusItem {
  const typeLabels: Record<string, string> = {
    birthday: '生日',
    anniversary: '纪念日',
    family_gathering: '家庭聚会',
    family_task: '家庭事项',
  };
  const tag = typeLabels[ev.event_type] ?? '家庭节点';
  return {
    type: daysUntil === 0 ? 'event-today' : 'event-upcoming',
    title: daysUntil === 0 ? `今天 · ${ev.title}` : ev.title,
    subtitle: daysUntil === 0 ? tag : `${tag} · 还有 ${daysUntil} 天`,
    daysUntil,
    href: `/family/calendar/${ev.id}`,
    hint: ev.event_type === 'family_gathering' ? '🍵' : '📅',
  };
}

function makeFestivalFocus(mk: FestivalInfo): FocusItem {
  return {
    type: 'festival',
    title: `今天是${mk.name}`,
    subtitle: '与家人共度，留下一段记忆',
    daysUntil: 0,
    href: '/family/stories',
    hint: '🏮',
  };
}

function makeSolarTermFocus(mk: FestivalInfo): FocusItem {
  return {
    type: 'solarTerm',
    title: `节气：${mk.name}`,
    subtitle: '记录节气这一天家里的小事',
    daysUntil: 0,
    href: '/family/calendar',
    hint: '🌿',
  };
}

function makeSolarHolidayFocus(mk: FestivalInfo): FocusItem {
  return {
    type: 'solarHoliday',
    title: `今天是${mk.name}`,
    subtitle: '问候一下家人吧',
    daysUntil: 0,
    href: '/family/calendar',
    hint: '🎉',
  };
}

function makeProgressFocus(
  family: FamilySpace,
  profiles: PersonProfile[],
  storiesCount: number
): FocusItem {
  if (profiles.length === 0) {
    return {
      type: 'progress',
      title: `欢迎来到${family.surname}氏家堂`,
      subtitle: '从添加第一位家人开始',
      href: '/family/relatives/new',
      hint: '🌱',
    };
  }
  const unclaimed = profiles.filter((p) => p.claim_status !== 'claimed').length;
  if (unclaimed > 0) {
    return {
      type: 'progress',
      title: `还有 ${unclaimed} 位家人待认领`,
      subtitle: '邀请家人扫码认领自己的档案',
      href: '/family/invite',
      hint: '📨',
    };
  }
  if (storiesCount === 0) {
    return {
      type: 'progress',
      title: '记录第一段家族故事',
      subtitle: '一段回忆，一件小事都可以',
      href: '/family/stories',
      hint: '📖',
    };
  }
  return {
    type: 'progress',
    title: `${family.surname}氏家堂 · 持续生长`,
    subtitle: `已记录 ${profiles.length} 位家人 · ${storiesCount} 段故事`,
    href: '/family/activity',
    hint: '🌳',
  };
}
