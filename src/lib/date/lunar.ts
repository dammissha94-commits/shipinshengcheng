/**
 * lunar.ts — 自包含的农历转换器（1900-2050）
 *
 * 数据格式：每年用一个 16 位整数编码
 *   - bit 0..11: 12 个农历月，1 = 30 天 / 0 = 29 天
 *   - bit 12..15: 闰月月份（0 = 无闰月）
 *   - 闰月长度另存于 leapDays 表（1 = 30 天 / 0 = 29 天）
 *
 * 数据来源：标准 Chinese Lunar Calendar 数据表（公开数学常数）。
 *
 * 不引入外部库，避免增加 bundle 体积；准确度对家庭场景已足够。
 */

// 1900..2050 共 151 年的农历数据
// 高 4 位：闰月 (0=无)；低 12 位：12 个月的大小（1=大月30天，0=小月29天）
// prettier-ignore
const LUNAR_INFO: number[] = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 1900-1909
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, // 1910-1919
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, // 1920-1929
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, // 1930-1939
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, // 1940-1949
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, // 1950-1959
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, // 1960-1969
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6, // 1970-1979
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, // 1980-1989
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0, // 1990-1999
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000-2009
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, // 2010-2019
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, // 2020-2029
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, // 2030-2039
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, // 2040-2049
  0x14b63,                                                                                    // 2050
];

const LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
const LUNAR_DAYS_TENS = ['初', '十', '廿', '三'];
const LUNAR_DAYS_UNITS = ['十', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

/** 某年农历总天数（含闰月） */
function lunarYearDays(year: number): number {
  let sum = 348; // 12 * 29
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (LUNAR_INFO[year - 1900] & i) ? 1 : 0;
  }
  return sum + leapMonthDays(year);
}

/** 闰月月份（0 = 无闰月） */
function leapMonth(year: number): number {
  return LUNAR_INFO[year - 1900] & 0xf;
}

/** 闰月天数（无闰月时 = 0） */
function leapMonthDays(year: number): number {
  if (leapMonth(year) === 0) return 0;
  return (LUNAR_INFO[year - 1900] & 0x10000) ? 30 : 29;
}

/** 普通月天数（month 1-12） */
function lunarMonthDays(year: number, month: number): number {
  return (LUNAR_INFO[year - 1900] & (0x10000 >> month)) ? 30 : 29;
}

export interface LunarDate {
  year: number;
  month: number;       // 1-12
  day: number;         // 1-30
  isLeap: boolean;
  /** 中文显示，如 "四月廿二" */
  monthDayLabel: string;
  /** 中文月份，如 "四月" / "闰四月" */
  monthLabel: string;
  /** 中文日期，如 "廿二" / "初一" */
  dayLabel: string;
}

/**
 * 公历转农历
 * 输入超出 1900-2050 范围时回退到公历的 "M月D日" 字串表示。
 */
export function solarToLunar(solar: Date): LunarDate {
  const year = solar.getFullYear();

  // 范围外保护
  if (year < 1900 || year > 2050) {
    const m = solar.getMonth() + 1;
    const d = solar.getDate();
    return {
      year,
      month: m,
      day: d,
      isLeap: false,
      monthDayLabel: `${m}月${d}日`,
      monthLabel: `${m}月`,
      dayLabel: `${d}日`,
    };
  }

  // 1900-01-31 是农历 1900 年正月初一
  const baseDate = Date.UTC(1900, 0, 31);
  const target = Date.UTC(solar.getFullYear(), solar.getMonth(), solar.getDate());
  let offset = Math.floor((target - baseDate) / 86400000);

  let lYear = 1900;
  while (lYear < 2051 && offset > 0) {
    const yd = lunarYearDays(lYear);
    if (offset < yd) break;
    offset -= yd;
    lYear++;
  }

  const leap = leapMonth(lYear);
  let isLeap = false;
  let lMonth = 1;
  let lDays = 0;

  for (lMonth = 1; lMonth < 13 && offset >= 0; lMonth++) {
    if (leap > 0 && lMonth === leap + 1 && !isLeap) {
      lMonth--;
      isLeap = true;
      lDays = leapMonthDays(lYear);
    } else {
      lDays = lunarMonthDays(lYear, lMonth);
    }
    if (offset < lDays) break;
    if (isLeap && lMonth === leap) isLeap = false;
    offset -= lDays;
  }

  const lDay = offset + 1;
  const monthLabel = (isLeap ? '闰' : '') + (LUNAR_MONTHS[lMonth - 1] ?? `${lMonth}`) + '月';
  const dayLabel = formatLunarDay(lDay);

  return {
    year: lYear,
    month: lMonth,
    day: lDay,
    isLeap,
    monthDayLabel: `${monthLabel}${dayLabel}`,
    monthLabel,
    dayLabel,
  };
}

function formatLunarDay(day: number): string {
  if (day < 1 || day > 30) return `${day}`;
  if (day === 10) return '初十';
  if (day === 20) return '二十';
  if (day === 30) return '三十';
  if (day < 10) return `初${LUNAR_DAYS_UNITS[day]}`;
  const tens = Math.floor(day / 10);
  const units = day % 10;
  return `${LUNAR_DAYS_TENS[tens]}${LUNAR_DAYS_UNITS[units]}`;
}

/**
 * 用于 UI 短显示的标签：
 *   - 农历正月初一 → "正月初一"
 *   - 农历四月廿二 → "四月廿二"
 *
 * 用空格分隔以便上层把月、日分两行渲染。
 */
export function getLunarDateLabel(date: Date = new Date()): string {
  const lunar = solarToLunar(date);
  return `${lunar.monthLabel} ${lunar.dayLabel}`;
}

/* ============================================================
 * 24 节气 — 基于 21 世纪基准值的近似公式
 * 准确度：±1 天（满足 UI 标注，不用于天文计算）
 * ============================================================ */

const SOLAR_TERMS = [
  '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
  '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
  '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
  '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
] as const;

export type SolarTerm = (typeof SOLAR_TERMS)[number];

// 各节气在公历中的所属月份（0-based）
const TERM_MONTH = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11];

// 21 世纪基准日（D 值），21 世纪通用（每年偏差 ±1 天）
const TERM_C_21 = [
  6.11, 20.84, 4.6295, 19.4599, 6.3826, 21.4155,
  5.59, 20.888, 6.318, 21.86, 6.5, 22.2,
  7.928, 23.65, 8.35, 23.95, 8.44, 23.822,
  9.098, 24.218, 8.218, 23.08, 7.9, 22.6,
];

// 部分年份的人为修正（罕见，公开数据；不影响 ±1 天 UI 体验，留作占位）
const TERM_DELTA: Record<string, number> = {
  // '2026-3': -1, // 例：2026 年某节气偏差修正占位
};

/**
 * 计算某年某节气的公历日（21 世纪近似）
 * @param year 年份（建议 2000-2099；其他年份精度下降但不报错）
 * @param termIndex 0..23（小寒 大寒 立春 ... 冬至）
 */
function getSolarTermDay(year: number, termIndex: number): number {
  const Y = year - 2000;
  const base = TERM_C_21[termIndex];
  // floor((Y - 1) / 4) 对应世纪内闰年补偿
  let day = Math.floor(Y * 0.2422 + base - Math.floor((Y - 1) / 4));
  const deltaKey = `${year}-${termIndex}`;
  if (deltaKey in TERM_DELTA) day += TERM_DELTA[deltaKey];
  return day;
}

export interface SolarTermInfo {
  name: SolarTerm;
  date: Date;
}

/** 给定日期是否对应某节气；命中返回节气名，否则 null */
export function getSolarTermOnDate(date: Date = new Date()): SolarTerm | null {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  // 任一节气只有一天命中（±1 天容差由公式保证）
  for (let i = 0; i < 24; i++) {
    if (TERM_MONTH[i] !== month) continue;
    if (getSolarTermDay(year, i) === day) return SOLAR_TERMS[i];
  }
  return null;
}

/** 列出某年全部 24 节气日期 */
export function listSolarTermsOfYear(year: number): SolarTermInfo[] {
  return SOLAR_TERMS.map((name, i) => ({
    name,
    date: new Date(year, TERM_MONTH[i], getSolarTermDay(year, i)),
  }));
}

/* ============================================================
 * 传统节日（农历）+ 公历纪念日
 * 仅保留中性、家庭场景适用的节日；
 * 避开任何 祭祀/宗教 相关词汇（项目边界约束）
 * ============================================================ */

/** 传统节日（农历）名称表 */
const LUNAR_FESTIVAL_TABLE: Record<string, string> = {
  '1-1': '春节',
  '1-15': '元宵节',
  '2-2': '龙抬头',
  '5-5': '端午节',
  '7-7': '七夕节',
  '8-15': '中秋节',
  '9-9': '重阳节',
  '12-8': '腊八节',
  '12-23': '北方小年',
  '12-24': '南方小年',
};

/** 公历常见家庭纪念日 */
const SOLAR_FESTIVAL_TABLE: Record<string, string> = {
  '1-1': '元旦',
  '3-8': '妇女节',
  '5-1': '劳动节',
  '5-4': '青年节',
  '6-1': '儿童节',
  '8-1': '建军节',
  '9-10': '教师节',
  '10-1': '国庆节',
};

export interface FestivalInfo {
  name: string;
  /** 'lunar' = 农历节日；'solar' = 公历纪念日；'solarTerm' = 节气 */
  source: 'lunar' | 'solar' | 'solarTerm';
}

/**
 * 综合查询某天的"标记"（节日 + 节气）
 * 优先级：传统农历节日 > 节气 > 公历纪念日
 * 一天可能同时命中多项，全部返回。
 */
export function getDateMarkers(date: Date = new Date()): FestivalInfo[] {
  const markers: FestivalInfo[] = [];

  const lunar = solarToLunar(date);
  // 除夕：腊月最后一天
  if (lunar.month === 12 && !lunar.isLeap) {
    const eveDay = lunarMonthDays(lunar.year, 12);
    if (lunar.day === eveDay) markers.push({ name: '除夕', source: 'lunar' });
  }
  const lunarKey = `${lunar.month}-${lunar.day}`;
  if (LUNAR_FESTIVAL_TABLE[lunarKey] && !lunar.isLeap) {
    markers.push({ name: LUNAR_FESTIVAL_TABLE[lunarKey], source: 'lunar' });
  }

  const term = getSolarTermOnDate(date);
  if (term) markers.push({ name: term, source: 'solarTerm' });

  const solarKey = `${date.getMonth() + 1}-${date.getDate()}`;
  if (SOLAR_FESTIVAL_TABLE[solarKey]) {
    markers.push({ name: SOLAR_FESTIVAL_TABLE[solarKey], source: 'solar' });
  }

  return markers;
}

/** 取主标签（用于 UI 单行显示）：节日 > 节气 > null */
export function getPrimaryMarker(date: Date = new Date()): FestivalInfo | null {
  const all = getDateMarkers(date);
  if (all.length === 0) return null;
  const lunar = all.find((m) => m.source === 'lunar');
  if (lunar) return lunar;
  const term = all.find((m) => m.source === 'solarTerm');
  if (term) return term;
  return all[0];
}
