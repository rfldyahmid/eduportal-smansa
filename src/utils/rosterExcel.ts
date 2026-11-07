import ExcelJS from 'exceljs';
import type { Student, Teacher } from '../types';

export type StudentImportRow = Omit<Student, 'id' | 'className'> & { className?: string; sourceRow?: number };
export type TeacherImportRow = Omit<Teacher, 'id' | 'photoUrl'> & { photoUrl?: string; sourceRow?: number };

export interface ParsedRosterWorkbook {
  students: StudentImportRow[];
  teachers: TeacherImportRow[];
}

const STUDENT_HEADERS = [
  'NISN', 'NIS', 'Nama Lengkap', 'Email', 'Jenis Kelamin', 'Kelas',
  'Wali Kelas', 'Tahun Ajaran'
];
const TEACHER_HEADERS = [
  'NIP', 'Nama Lengkap', 'Gelar', 'Mata Pelajaran / Jabatan', 'Departemen',
  'Email', 'Telepon', 'Pendidikan', 'Kelas Diampu', 'Wali Kelas', 'Bio'
];

const normalizeHeader = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  if ('text' in value && typeof value.text === 'string') return value.text.trim();
  if ('richText' in value && Array.isArray(value.richText)) {
    return value.richText.map(part => part.text).join('').trim();
  }
  return '';
}

function readRows(workbook: ExcelJS.Workbook, sheetName: string, aliases: Record<string, string>) {
  const sheet = workbook.worksheets.find(item => normalizeHeader(item.name) === normalizeHeader(sheetName));
  if (!sheet) throw new Error(`Sheet "${sheetName}" tidak ditemukan di workbook.`);
  if (sheet.rowCount > 10001) throw new Error(`Sheet "${sheetName}" melebihi batas 10.000 baris data.`);

  const headers = new Map<number, string>();
  sheet.getRow(1).eachCell((cell, column) => {
    const key = aliases[normalizeHeader(cellText(cell.value))];
    if (key) headers.set(column, key);
  });
  const requiredHeaders = sheetName === 'Siswa'
    ? ['nisn', 'fullName', 'email', 'gender', 'classId']
    : ['nip', 'fullName', 'subject', 'email', 'department'];
  const foundHeaders = new Set(headers.values());
  const missingHeaders = requiredHeaders.filter(header => !foundHeaders.has(header));
  if (missingHeaders.length) {
    const labels: Record<string, string> = {
      nisn: 'NISN', nip: 'NIP', fullName: 'Nama Lengkap', email: 'Email',
      gender: 'Jenis Kelamin', classId: 'Kelas', subject: 'Mata Pelajaran / Jabatan',
      department: 'Departemen'
    };
    throw new Error(`Sheet "${sheetName}" belum memiliki kolom wajib: ${missingHeaders.map(header => labels[header]).join(', ')}.`);
  }

  const rows: Record<string, string>[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const record: Record<string, string> = {};
    for (const [column, key] of headers) {
      const cell = row.getCell(column);
      if (
        ['nisn', 'nis', 'nip', 'phone'].includes(key) &&
        typeof cell.value === 'number' &&
        String(Math.trunc(Math.abs(cell.value))).length > 15
      ) {
        throw new Error(`Sheet "${sheetName}" baris ${rowNumber}: ${key.toUpperCase()} terlalu panjang jika disimpan sebagai angka. Ubah format sel menjadi teks di Excel.`);
      }
      record[key] = typeof cell.value === 'number' ? cell.text.trim() : cellText(cell.value);
    }
    if (Object.values(record).some(value => value !== '')) {
      record.__rowNumber = String(rowNumber);
      rows.push(record);
    }
  }
  return rows;
}

const STUDENT_ALIASES: Record<string, string> = {
  nisn: 'nisn', nomornisn: 'nisn', nis: 'nis', nomornis: 'nis',
  namalengkap: 'fullName', nama: 'fullName', fullname: 'fullName',
  email: 'email', emailaktif: 'email', jeniskelamin: 'gender', gender: 'gender',
  kelas: 'classId', class: 'classId', classid: 'classId',
  walikelas: 'homeroomTeacher', tahunajaran: 'academicYear', academicyear: 'academicYear'
};

const TEACHER_ALIASES: Record<string, string> = {
  nip: 'nip', nomornip: 'nip', namalengkap: 'fullName', nama: 'fullName', fullname: 'fullName',
  gelar: 'degree', degree: 'degree', matapelajaran: 'subject', jabatan: 'subject',
  matapelajaranjabatan: 'subject', subject: 'subject', departemen: 'department',
  rumpundepartemen: 'department', department: 'department', rumpun: 'department',
  email: 'email', emailaktif: 'email', telepon: 'phone', notelepon: 'phone', phone: 'phone',
  pendidikan: 'education', education: 'education', kelasdiampu: 'classesTaught',
  kelasajar: 'classesTaught', kelasyangdiampu: 'classesTaught', walikelas: 'homeroomClass',
  bio: 'bio', biografi: 'bio'
};

export async function parseRosterWorkbook(file: File): Promise<ParsedRosterWorkbook> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    throw new Error('Gunakan file Excel .xlsx. Unduh template untuk format yang sesuai.');
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('Ukuran file maksimal 10 MB.');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const studentRows = readRows(workbook, 'Siswa', STUDENT_ALIASES);
  const teacherRows = readRows(workbook, 'Guru & Staff', TEACHER_ALIASES);
  if (!studentRows.length && !teacherRows.length) {
    throw new Error('Workbook tidak berisi data siswa maupun guru/staf.');
  }

  return {
    students: studentRows.map(row => ({
      nisn: row.nisn,
      nis: row.nis || '',
      fullName: row.fullName,
      email: row.email,
      gender: row.gender as Student['gender'],
      classId: row.classId,
      className: row.classId,
      academicYear: row.academicYear || '2026/2027',
      homeroomTeacher: row.homeroomTeacher || '-',
      sourceRow: Number(row.__rowNumber)
    })),
    teachers: teacherRows.map(row => ({
      nip: row.nip,
      fullName: row.fullName,
      degree: row.degree || '',
      subject: row.subject,
      department: row.department as Teacher['department'],
      classesTaught: row.classesTaught ? row.classesTaught.split(/[,;]/).map(value => value.trim()).filter(Boolean) : [],
      homeroomClass: row.homeroomClass || '',
      education: row.education || '',
      email: row.email,
      phone: row.phone || '-',
      photoUrl: '',
      bio: row.bio || '',
      sourceRow: Number(row.__rowNumber)
    }))
  };
}

export async function downloadRosterTemplate(): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EDUPORTAL';

  const students = workbook.addWorksheet('Siswa');
  students.addRow(STUDENT_HEADERS);
  students.getColumn(1).numFmt = '@';
  students.getColumn(2).numFmt = '@';
  students.views = [{ state: 'frozen', ySplit: 1 }];
  students.autoFilter = { from: 'A1', to: 'H1' };

  const teachers = workbook.addWorksheet('Guru & Staff');
  teachers.addRow(TEACHER_HEADERS);
  teachers.getColumn(1).numFmt = '@';
  teachers.getColumn(7).numFmt = '@';
  teachers.views = [{ state: 'frozen', ySplit: 1 }];
  teachers.autoFilter = { from: 'A1', to: 'K1' };

  for (const sheet of workbook.worksheets) {
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    sheet.columns.forEach(column => { column.width = 22; });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'template-data-siswa-guru.xlsx';
  link.click();
  URL.revokeObjectURL(url);
}
