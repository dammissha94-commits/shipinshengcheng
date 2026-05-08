/**
 * 将 src 目录下所有硬编码 hex 色值收敛到 CSS token。
 * 用法：node replace-hex.cjs <目录>
 *
 * 映射规则（按优先级，先匹配特殊值）:
 *   gold 系  → var(--gold) / var(--gold-light)
 *   ink   系  → var(--ink-1/2/3)
 *   surface/line → var(--surface-1/2/3) / var(--line-1/2)
 *   walnut    → var(--walnut) / var(--walnut-light)
 *   terracotta → var(--terracotta)
 *   jade      → var(--jade)
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

const root = process.argv[2] || '.';

// 映射表：key = 十六进制（不区分大小写），value = 替换后的 token 字符串
// ⚠️ 顺序重要：先匹配更具体的带透明度写法（如 /20），再匹配普通写法
const HEX_MAP = {
  // —— gold 系 — 统一收敛到 var(--gold) / var(--gold-light)
  '#B88746':  'var(--gold)',
  '#B8924E':  'var(--gold)',
  '#D2B46E':  'var(--gold-light)',
  '#C99A55':  'var(--gold)',
  '#D9B06B':  'var(--gold)',
  '#9B6A37':  'var(--gold)',
  '#F4DCB3':  'var(--gold-light)',
  '#EFCB87':  'var(--gold-light)',
  '#F4EBDD':  'var(--surface-3)',
  '#F6EDDC':  'var(--surface-3)',
  '#F8EEDC':  'var(--surface-3)',
  '#FBF6ED':  'var(--surface-2)',
  '#F2E8D8':  'var(--surface-2)',
  '#F8F1E7':  'var(--surface-2)',
  '#E7D9C9':  'var(--line-1)',
  '#E9DCC9':  'var(--line-1)',
  '#EADBC5':  'var(--line-2)',
  '#D0C4B5':  'var(--line-2)',
  '#EEF5EE':  'var(--surface-3)',
  '#D9E4D8':  'var(--surface-3)',
  '#4F745F':  'var(--jade)',
  '#5D8C63':  'var(--jade)',
  '#6F8A79':  'var(--jade)',
  '#A9674A':  'var(--terracotta)',
  '#8B5A3C':  'var(--walnut)',
  '#5A3524':  'var(--walnut)',
  '#6B3A29':  'var(--walnut)',
  '#7A4B34':  'var(--walnut-light)',
  '#8A7465':  'var(--ink-3)',
  '#6D625C':  'var(--ink-3)',
  '#4A2A1A':  'var(--ink-2)',
  '#2A1D16':  'var(--ink-1)',
  '#4E342E':  'var(--ink-2)',
  '#C06035':  'var(--terracotta)',
  '#40271D':  'var(--walnut)',
  // SVG 中的特殊绿色（tree illustration）
  '#91A37E':  'var(--jade)',

  // —— 遗漏的 warm 色 — 第二轮补充
  '#FFFDF8':  'var(--surface-1)',
  '#A66F3D':  'var(--gold-light)',
  '#F4E8DC':  'var(--surface-3)',
  '#A67B47':  'var(--walnut-light)',
  '#DCCCA9':  'var(--surface-2)',
  '#E7D6BE':  'var(--surface-2)',
  '#FBF0DE':  'var(--surface-2)',
  '#F1DEC7':  'var(--surface-2)',
  '#9B8F84':  'var(--ink-3)',
  '#A99A8B':  'var(--ink-placeholder)',
  '#D9C4B2':  'var(--gold-light)',
  '#FBF2E5':  'var(--surface-2)',
  '#F4E5CC':  'var(--surface-3)',
  '#B99255':  'var(--gold)',
  '#C06035':  'var(--terracotta)',
  '#3F2418':  'var(--walnut)',
  // —— 第三轮补充（2025-05-06）
  '#FFF8E7':  'var(--surface-2)',
  '#EBD7BE':  'var(--surface-2)',
  '#FBF4E8':  'var(--surface-2)',
  '#9C7042':  'var(--gold)',
  '#7E736A':  'var(--ink-3)',
  '#F9F1E5':  'var(--surface-2)',
  '#C9D8C9':  'var(--line-1)',
  '#F2FAF0':  'var(--surface-3)',
  '#5E8F6D':  'var(--jade)',
  '#F4E9DC':  'var(--surface-3)',
  '#8B5A2E':  'var(--walnut)',
  '#D36A42':  'var(--terracotta)',
  '#B84D2B':  'var(--terracotta)',
  '#6AA077':  'var(--jade)',
  '#3F7B58':  'var(--jade)',
  '#B18B55':  'var(--walnut)',
  '#8A6334':  'var(--walnut-light)',
  '#D9AA52':  'var(--gold)',
  '#B7832E':  'var(--gold)',
  '#15110E':  'var(--ink-1)',
  '#3A2418':  'var(--ink-2)',
  '#EEE2D3':  'var(--surface-2)',
  '#D06A3D':  'var(--gold)',
  '#9F4B29':  'var(--gold)',
  '#E0D5C7':  'var(--line-1)',
  '#5D5049':  'var(--ink-2)',
  '#D8E6D3':  'var(--line-2)',
  '#E0C7A7':  'var(--gold-light)',
  // —— 第四轮：family/page.tsx 及相关文件遗漏
  '#6D4C41':  'var(--ink-3)',
  '#E4CAA3':  'var(--surface-3)',
  '#D6D0C3':  'var(--surface-2)',
  '#8D6E63':  'var(--walnut-light)',
  '#5A544B':  'var(--ink-1)',
  '#9A928C':  'var(--ink-3)',
  '#C79A61':  'var(--gold)',
  '#B8A898':  'var(--ink-placeholder)',
  '#E6D2BA':  'var(--surface-2)',
  '#D9C9B6':  'var(--line-2)',
  '#FFF7EC':  'var(--surface-1)',
  '#A99482':  'var(--ink-3)',
};

// 构建正则：匹配 # 后跟 3~8 个十六进制字符（支持 /opacity 写法）
// 例如：#8B5A3C /20 、#5A3524 、#D2B46E/18
function buildRegex() {
  const hexPart = '#[0-9A-Fa-f]{3,8}';
  const opacityPart = '(\\/[0-9.%]+)?';
  return new RegExp(`(${hexPart}${opacityPart})`, 'g');
}

const HEX_RE = buildRegex();

let fixedFiles = 0;
let totalReplacements = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!/\.(tsx?|css)$/.test(entry.name)) continue;

    let content = fs.readFileSync(full, 'utf8');
    let changed = false;

    content = content.replace(HEX_RE, (match) => {
      // 分离 opacity 后缀
      const sep = match.indexOf('/');
      const hex = sep === -1 ? match : match.slice(0, sep);
      const suffix = sep === -1 ? '' : match.slice(sep);
      const normalizedHex = hex.toUpperCase();
      const replacement = HEX_MAP[normalizedHex];
      if (!replacement) return match;
      changed = true;
      totalReplacements++;
      // opacity 后缀追加到 replacement 后面
      // 例如 var(--gold)/20
      return `${replacement}${suffix}`;
    });

    if (changed) {
      fs.writeFileSync(full, content, 'utf8');
      fixedFiles++;
      console.log('✅', path.relative(root, full));
    }
  }
}

walk(root);
console.log(`\nDone — fixed ${totalReplacements} replacement(s) across ${fixedFiles} file(s).`);
