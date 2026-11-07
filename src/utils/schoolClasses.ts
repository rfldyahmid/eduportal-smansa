export const SCHOOL_CLASSES = [
  'X-A', 'X-B', 'X-C', 'X-D', 'X-E',
  'XI-A', 'XI-B', 'XI-C', 'XI-D', 'XI-E',
  'XII-A', 'XII-B', 'XII-C', 'XII-D', 'XII-E'
] as const;

export type SchoolClass = typeof SCHOOL_CLASSES[number];

const SCHOOL_CLASS_SET: ReadonlySet<string> = new Set(SCHOOL_CLASSES);

export function normalizeSchoolClassId(value: string): string {
  const classId = value.trim().toUpperCase().replace(/\s+/g, '-');
  if (SCHOOL_CLASS_SET.has(classId)) return classId;

  const legacy = classId.match(/^(XII|XI|X)(?:-(?:MIPA|IPS|FASE-E(?:-\(UMUM\))?))?-(\d+)$/);
  if (!legacy) return value;

  const section = Number(legacy[2]);
  if (section < 1 || section > 5) return value;
  return `${legacy[1]}-${String.fromCharCode(64 + section)}`;
}

export function isSchoolClass(value: string): value is SchoolClass {
  return SCHOOL_CLASS_SET.has(value);
}
