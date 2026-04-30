import type { FamilySpace, Person } from '@/types/domain';

const FAMILY_KEY = 'wjct_family';
const PERSONS_KEY = 'wjct_persons';
const EMPTY_PERSONS: Person[] = [];

// ── Subscriber notification (used by useSyncExternalStore in hooks.ts) ──────
type Listener = () => void;
const storageListeners = new Set<Listener>();

export function subscribeToStorage(listener: Listener): () => void {
  storageListeners.add(listener);

  function handleStorage(event: StorageEvent): void {
    if (event.key === FAMILY_KEY || event.key === PERSONS_KEY) {
      notifyAll();
    }
  }

  window.addEventListener('storage', handleStorage);

  return () => {
    storageListeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
  };
}

function notifyAll(): void {
  storageListeners.forEach((l) => l());
}

// ── Memoized snapshots (useSyncExternalStore requires stable references) ─────
let cachedFamilyRaw: string | null | undefined = undefined;
let cachedFamilyVal: FamilySpace | null = null;

let cachedPersonsRaw: string | null | undefined = undefined;
let cachedPersonsVal: Person[] = [];

export function getFamily(): FamilySpace | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FAMILY_KEY);
    if (raw !== cachedFamilyRaw) {
      cachedFamilyRaw = raw;
      cachedFamilyVal = raw ? (JSON.parse(raw) as FamilySpace) : null;
    }
    return cachedFamilyVal;
  } catch {
    return null;
  }
}

export function getPersons(): Person[] {
  if (typeof window === 'undefined') return EMPTY_PERSONS;
  try {
    const raw = localStorage.getItem(PERSONS_KEY);
    if (raw !== cachedPersonsRaw) {
      cachedPersonsRaw = raw;
      cachedPersonsVal = raw ? (JSON.parse(raw) as Person[]) : EMPTY_PERSONS;
    }
    return cachedPersonsVal;
  } catch {
    return EMPTY_PERSONS;
  }
}

// ── Mutations ────────────────────────────────────────────────────────────────
export function saveFamily(family: FamilySpace): void {
  const str = JSON.stringify(family);
  localStorage.setItem(FAMILY_KEY, str);
  cachedFamilyRaw = str;
  cachedFamilyVal = family;
  notifyAll();
}

export function savePersons(persons: Person[]): void {
  const str = JSON.stringify(persons);
  localStorage.setItem(PERSONS_KEY, str);
  cachedPersonsRaw = str;
  cachedPersonsVal = persons;
  notifyAll();
}

export function addPerson(person: Person): void {
  savePersons([...getPersons(), person]);
}

export function clearAll(): void {
  localStorage.removeItem(FAMILY_KEY);
  localStorage.removeItem(PERSONS_KEY);
  cachedFamilyRaw = undefined;
  cachedFamilyVal = null;
  cachedPersonsRaw = undefined;
  cachedPersonsVal = [];
  notifyAll();
}

export function calcCompletion(persons: Person[]): number {
  const keyRelations = [
    'father', 'mother', 'spouse', 'child',
    'grandfather_paternal', 'grandmother_paternal',
    'grandfather_maternal', 'grandmother_maternal',
  ];
  const filled = keyRelations.filter((r) => persons.some((p) => p.relation === r)).length;
  return Math.round((filled / keyRelations.length) * 100);
}
