export function formatTempleName(surname: string): string {
  const normalizedSurname = surname.trim();
  return normalizedSurname ? `${normalizedSurname}氏祠堂` : '吾家祠堂';
}
