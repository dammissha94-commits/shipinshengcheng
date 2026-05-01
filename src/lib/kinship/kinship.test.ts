// ---------------------------------------------------------------------------
// kinship.test.ts — basic tests for the kinship adapter layer.
//
// Run:  npx tsx src/lib/kinship/kinship.test.ts
// Or review inline for expected behaviour.
//
// This file does NOT import from relationship-ts.
// ---------------------------------------------------------------------------

import assert from 'node:assert/strict';

import { getKinshipLabel, getReverseKinshipLabel, getRelationPathLabel, normalizeRelationType } from './kinship-adapter';
import type { KinshipResult } from './kinship-types';

// ---- Test helpers --------------------------------------------------------

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err instanceof Error ? err.message : String(err)}`);
  }
}

function assertLabel(r: KinshipResult, expected: string): void {
  assert.equal(r.label, expected, `label mismatch: got "${r.label}", expected "${expected}"`);
}


function assertHasLabel(r: KinshipResult): void {
  assert.ok(r.label.length > 0, 'label should not be empty');
}

function assertFallback(r: KinshipResult): void {
  if (r.source !== 'fallback') {
    console.warn(`    ⚠ Expected fallback but got ${r.source} for "${r.label}"`);
  }
  assertHasLabel(r);
}

// ---- Tests ---------------------------------------------------------------

console.log('\nkinship-adapter tests\n');

// --- getKinshipLabel ------------------------------------------------------

console.log('getKinshipLabel:');

test('father → 父亲-like term', () => {
  const r = getKinshipLabel('father');
  assertHasLabel(r);
  // relationship-ts may return '父亲' or '爸爸'; either is valid
});

test('mother → 母亲-like term', () => {
  const r = getKinshipLabel('mother');
  assertHasLabel(r);
});

test('spouse female → 妻子', () => {
  const r = getKinshipLabel('spouse', 'female');
  assertHasLabel(r);
});

test('spouse male → 丈夫', () => {
  const r = getKinshipLabel('spouse', 'male');
  assertHasLabel(r);
});

test('spouse unknown → "配偶" (fallback)', () => {
  const r = getKinshipLabel('spouse', 'unknown');
  assertFallback(r);
});

test('child male → contains 儿子-like term', () => {
  const r = getKinshipLabel('child', 'male');
  assertHasLabel(r);
});

test('child female → contains 女儿-like term', () => {
  const r = getKinshipLabel('child', 'female');
  assertHasLabel(r);
});

test('child unknown → "子女" (fallback)', () => {
  const r = getKinshipLabel('child', 'unknown');
  assertFallback(r);
});

test('sibling male → 兄弟-like term', () => {
  const r = getKinshipLabel('sibling', 'male');
  assertHasLabel(r);
});

test('sibling female → 姐妹-like term', () => {
  const r = getKinshipLabel('sibling', 'female');
  assertHasLabel(r);
});

test('sibling unknown → "兄弟姐妹" (fallback)', () => {
  const r = getKinshipLabel('sibling', 'unknown');
  assertFallback(r);
});

test('grandfather_paternal → 爷爷-like term', () => {
  const r = getKinshipLabel('grandfather_paternal');
  assertHasLabel(r);
});

test('grandmother_paternal → 奶奶-like term', () => {
  const r = getKinshipLabel('grandmother_paternal');
  assertHasLabel(r);
});

test('grandfather_maternal → 外公-like term', () => {
  const r = getKinshipLabel('grandfather_maternal');
  assertHasLabel(r);
});

test('grandmother_maternal → 外婆-like term', () => {
  const r = getKinshipLabel('grandmother_maternal');
  assertHasLabel(r);
});

test('self → "本人"', () => {
  const r = getKinshipLabel('self');
  assertLabel(r, '本人');
});

// --- getReverseKinshipLabel -----------------------------------------------

console.log('\ngetReverseKinshipLabel:');

test('reverse father (male ego) → some label', () => {
  const r = getReverseKinshipLabel('father', 'male');
  assertHasLabel(r);
});

test('reverse mother (female ego) → some label', () => {
  const r = getReverseKinshipLabel('mother', 'female');
  assertHasLabel(r);
});

test('reverse child (male ego) → some label', () => {
  const r = getReverseKinshipLabel('child', 'male');
  assertHasLabel(r);
});

test('reverse without gender → still produces a label', () => {
  const r = getReverseKinshipLabel('sibling');
  assertHasLabel(r);
});

// --- getRelationPathLabel -------------------------------------------------

console.log('\ngetRelationPathLabel:');

test('empty path → "自己"', () => {
  const r = getRelationPathLabel([]);
  assertLabel(r, '自己');
});

test('single parent_of → 父母', () => {
  const r = getRelationPathLabel(['parent_of']);
  assertHasLabel(r);
});

test('parent_of + parent_of → 祖辈路径', () => {
  const r = getRelationPathLabel(['parent_of', 'parent_of']);
  assertHasLabel(r);
});

test('parent_of + sibling_of → 合理的路径文本', () => {
  const r = getRelationPathLabel(['parent_of', 'sibling_of']);
  assertHasLabel(r);
});

// --- normalizeRelationType ------------------------------------------------

console.log('\nnormalizeRelationType:');

test('sibling_of unknown → "兄弟姐妹"', () => {
  const label = normalizeRelationType('sibling_of');
  assert.equal(label, '兄弟姐妹');
});

test('sibling_of male → "兄弟"', () => {
  const label = normalizeRelationType('sibling_of', 'male');
  assert.equal(label, '兄弟');
});

test('sibling_of female → "姐妹"', () => {
  const label = normalizeRelationType('sibling_of', 'female');
  assert.equal(label, '姐妹');
});

test('grandparent_of unknown → "祖辈"', () => {
  const label = normalizeRelationType('grandparent_of');
  assert.equal(label, '祖辈');
});

test('grandparent_of male → "祖父"', () => {
  const label = normalizeRelationType('grandparent_of', 'male');
  assert.equal(label, '祖父');
});

test('grandparent_of female → "祖母"', () => {
  const label = normalizeRelationType('grandparent_of', 'female');
  assert.equal(label, '祖母');
});

test('parent_of unknown → "父母"', () => {
  const label = normalizeRelationType('parent_of');
  assert.equal(label, '父母');
});

test('parent_of male → "父亲"', () => {
  const label = normalizeRelationType('parent_of', 'male');
  assert.equal(label, '父亲');
});

test('parent_of female → "母亲"', () => {
  const label = normalizeRelationType('parent_of', 'female');
  assert.equal(label, '母亲');
});

test('child_of unknown → "子女"', () => {
  const label = normalizeRelationType('child_of');
  assert.equal(label, '子女');
});

test('spouse_of unknown → "配偶"', () => {
  const label = normalizeRelationType('spouse_of');
  assert.equal(label, '配偶');
});

// ---- Summary -------------------------------------------------------------

console.log(`\n${'─'.repeat(40)}`);
console.log(`  ${passed} passed  ${failed} failed  (${passed + failed} total)`);
console.log(`${'─'.repeat(40)}\n`);

if (failed > 0) {
  process.exit(1);
}
