// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

const root = process.argv[2] || '.';
const exts = new Set(['.tsx', '.ts', '.css']);

// order matters: more specific patterns first
const replacements = [
  [/bg-stone-50(?!\w)/g, 'bg-[var(--surface-1)]'],
  [/bg-stone-100(?!\w)/g, 'bg-[var(--surface-2)]'],
  [/bg-stone-200(?!\w)/g, 'bg-[var(--line-1)]'],
  [/bg-stone-300(?!\w)/g, 'bg-[var(--line-2)]'],
  [/border-stone-100(?!\w)/g, 'border-[var(--surface-2)]'],
  [/border-stone-200(?!\w)/g, 'border-[var(--line-1)]'],
  [/border-stone-300(?!\w)/g, 'border-[var(--line-2)]'],
  [/text-stone-400(?!\w)/g, 'text-[var(--ink-3)]'],
  [/text-stone-500(?!\w)/g, 'text-[var(--ink-3)]'],
  [/text-stone-600(?!\w)/g, 'text-[var(--ink-2)]'],
  [/text-stone-700(?!\w)/g, 'text-[var(--ink-2)]'],
  [/text-stone-800(?!\w)/g, 'text-[var(--ink-1)]'],
  [/text-stone-900(?!\w)/g, 'text-[var(--ink-1)]'],
  [/hover:bg-stone-300(?!\w)/g, 'hover:bg-[var(--surface-3)]'],
  [/hover:bg-stone-100(?!\w)/g, 'hover:bg-[var(--surface-2)]'],
  [/hover:text-stone-300(?!\w)/g, 'hover:text-[var(--ink-2)]'],
  [/hover:text-stone-500(?!\w)/g, 'hover:text-[var(--ink-2)]'],
  [/hover:text-stone-600(?!\w)/g, 'hover:text-[var(--ink-1)]'],
  [/hover:border-stone-200(?!\w)/g, 'hover:border-[var(--line-1)]'],
  [/hover:border-stone-300(?!\w)/g, 'hover:border-[var(--line-2)]'],
  [/focus:border-stone-300(?!\w)/g, 'focus:border-[var(--line-2)]'],
  [/ring-stone-200(?!\w)/g, 'ring-[var(--line-1)]'],
  [/ring-offset-stone-50(?!\w)/g, 'ring-offset-[var(--surface-1)]'],
  [/divide-stone-100(?!\w)/g, 'divide-[var(--line-1)]'],
];

let fixedFiles = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!exts.has(path.extname(entry.name))) continue;
    let content = fs.readFileSync(full, 'utf8');
    let changed = false;
    for (const [re, sub] of replacements) {
      if (re.test(content)) { content = content.replace(re, sub); changed = true; }
    }
    if (changed) { fs.writeFileSync(full, content, 'utf8'); fixedFiles++; console.log('✅', path.relative(root, full)); }
  }
}

walk(root);
console.log(`\nDone — fixed ${fixedFiles} file(s).`);
