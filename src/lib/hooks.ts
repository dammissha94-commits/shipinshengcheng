'use client';

import { useSyncExternalStore } from 'react';
import { getFamily, getPersons, subscribeToStorage } from './storage';
import type { FamilySpace, Person } from '@/types/domain';

const EMPTY_PERSONS: Person[] = [];

export function useFamily(): FamilySpace | null {
  return useSyncExternalStore(subscribeToStorage, getFamily, () => null);
}

export function usePersons(): Person[] {
  return useSyncExternalStore(subscribeToStorage, getPersons, () => EMPTY_PERSONS);
}
