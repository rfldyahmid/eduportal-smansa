export const TEACHER_SUBJECTS = [
  { subject: 'Kepala Sekolah', title: 'Kepala Sekolah' },
  { subject: 'Biologi', title: 'Guru Biologi' },
  { subject: 'Fisika', title: 'Guru Fisika' },
  { subject: 'Matematika', title: 'Guru Matematika' },
  { subject: 'Kimia', title: 'Guru Kimia' },
  { subject: 'Bahasa Indonesia', title: 'Guru Bahasa Indonesia' },
  { subject: 'Bahasa Inggris', title: 'Guru Bahasa Inggris' },
  { subject: 'Bimbingan Konseling', title: 'Guru Bimbingan Konseling' },
  { subject: 'Agama Islam', title: 'Guru Agama Islam' },
  { subject: 'Agama Kristen', title: 'Guru Agama Kristen' },
  { subject: 'Sejarah', title: 'Guru Sejarah' },
  { subject: 'Geografi', title: 'Guru Geografi' },
  { subject: 'PPKN', title: 'Guru PPKN' },
  { subject: 'Olahraga', title: 'Guru Olahraga' },
  { subject: 'Prakarya', title: 'Guru Prakarya' }
] as const;

export function getCanonicalTeacherSubject(subject: unknown): string | undefined {
  if (typeof subject !== 'string') return undefined;
  const normalized = subject.trim().toLocaleLowerCase('id').replace(/^guru\s+/, '');
  if (normalized.includes('kepala sekolah')) return 'Kepala Sekolah';
  if (normalized.includes('biologi') || normalized.includes('ekologi')) return 'Biologi';
  if (normalized.includes('fisika')) return 'Fisika';
  if (normalized.includes('matematika')) return 'Matematika';
  if (normalized.includes('kimia')) return 'Kimia';
  if (normalized.includes('bahasa') && normalized.includes('indonesia')) return 'Bahasa Indonesia';
  if (normalized.includes('bahasa') && normalized.includes('inggris')) return 'Bahasa Inggris';
  if (normalized.includes('bimbingan konseling') || normalized === 'bk') return 'Bimbingan Konseling';
  if (normalized.includes('agama islam')) return 'Agama Islam';
  if (normalized.includes('agama kristen')) return 'Agama Kristen';
  if (normalized.includes('sejarah')) return 'Sejarah';
  if (normalized.includes('geografi')) return 'Geografi';
  if (normalized.includes('ppkn')) return 'PPKN';
  if (normalized.includes('olahraga') || normalized.includes('jasmani')) return 'Olahraga';
  if (normalized.includes('prakarya')) return 'Prakarya';
  return undefined;
}
