import type { Person } from '@/types/domain';

export function calcCompletion(persons: Person[]): number {
  const keyRelations = [
    'father',
    'mother',
    'spouse',
    'child',
    'grandfather_paternal',
    'grandmother_paternal',
    'grandfather_maternal',
    'grandmother_maternal',
  ];
  const filled = keyRelations.filter((relation) =>
    persons.some((person) => person.relation === relation)
  ).length;
  return Math.round((filled / keyRelations.length) * 100);
}
