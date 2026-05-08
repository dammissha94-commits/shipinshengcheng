/**
 * 主题切换工具
 *
 * 两个独立维度：
 *   1) 配色模式 ThemeMode：'light' | 'dark' | 'system'
 *   2) 对比度模式 ContrastMode：'normal' | 'high'
 *
 * 持久化于 localStorage('wj-theme' / 'wj-contrast')，
 * layout.tsx 的内联脚本在水合前读取并应用，避免首屏闪烁。
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ContrastMode = 'normal' | 'high';

export const THEME_STORAGE_KEY = 'wj-theme';
export const CONTRAST_STORAGE_KEY = 'wj-contrast';

/** 解析配色模式 → 具体值（system 折叠为 light/dark） */
function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** 应用配色模式到 <html> */
export function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolveTheme(mode));
}

/** 应用对比度模式到 <html> */
export function applyContrast(mode: ContrastMode): void {
  if (typeof document === 'undefined') return;
  if (mode === 'high') {
    document.documentElement.setAttribute('data-contrast', 'high');
  } else {
    document.documentElement.removeAttribute('data-contrast');
  }
}

export function setTheme(mode: ThemeMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  applyTheme(mode);
}

export function setContrast(mode: ContrastMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONTRAST_STORAGE_KEY, mode);
  applyContrast(mode);
}

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const v = localStorage.getItem(THEME_STORAGE_KEY);
  if (v === 'light' || v === 'dark' || v === 'system') return v;
  return 'system';
}

export function getStoredContrast(): ContrastMode {
  if (typeof window === 'undefined') return 'normal';
  const v = localStorage.getItem(CONTRAST_STORAGE_KEY);
  return v === 'high' ? 'high' : 'normal';
}

/**
 * Inline script — layout.tsx 的 <head> 内同步执行
 * 一次性应用配色与对比度（避免 FOUC）
 */
export const themeBootstrapScript = `
(function(){
  try {
    var k='${THEME_STORAGE_KEY}';
    var ck='${CONTRAST_STORAGE_KEY}';
    var m=localStorage.getItem(k)||'system';
    var resolved = m==='system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : m;
    document.documentElement.setAttribute('data-theme', resolved);
    var c = localStorage.getItem(ck);
    if (c === 'high') document.documentElement.setAttribute('data-contrast', 'high');
  } catch(e){}
})();
`;
