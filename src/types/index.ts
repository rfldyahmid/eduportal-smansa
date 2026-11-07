export type UserRole = 'siswa' | 'guru' | 'admin' | 'kepala_sekolah' | 'ketua_kombel';

export interface UserAccount {
  id: string;
  username: string; // NISN for student, NIP for teacher, email for admin
  passwordHash: string;
  salt: string;
  role: UserRole;
  fullName: string;
  email: string;
  avatarUrl?: string;
  linkedId?: string; // Links to studentId or teacherId
  mustChangePassword?: boolean;
}

export interface Student {
  id: string;
  nisn: string;
  nis: string;
  fullName: string;
  email?: string;
  gender: 'Laki-laki' | 'Perempuan';
  classId: string; // e.g. "X-A", "XI-B", "XII-E"
  className: string;
  academicYear: string;
  homeroomTeacher: string;
}

export interface Teacher {
  id: string;
  nip: string;
  fullName: string;
  degree: string;
  subject: string;
  department: 'MIPA' | 'Bahasa' | 'IPS' | 'Seni & Olahraga' | 'BK' | 'Informatika';
  classesTaught: string[];
  homeroomClass?: string;
  education: string;
  email: string;
  phone: string;
  photoUrl: string;
  bio: string;
}

export interface ScheduleItem {
  id: string;
  day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
  startTime: string;
  endTime: string;
  subject: string;
  teacherName: string;
  teacherId?: string;
  classId: string;
  room: string;
  colorTag: string;
  updatedAt?: string;
}

export interface PPDBApplicant {
  id: string;
  registrationNumber: string; // e.g. PPDB-2026-0012
  nisn: string;
  nik: string;
  fullName: string;
  gender: 'Laki-laki' | 'Perempuan';
  birthPlaceDate: string;
  phone: string;
  email: string;
  address: string;
  previousSchool: string; // SMP asal
  track: 'Zonasi' | 'Prestasi Akademik' | 'Prestasi Non-Akademik' | 'Afirmasi' | 'Pindah Tugas';
  averageReportScore: number;
  status: 'Menunggu Verifikasi' | 'Berkas Terverifikasi' | 'Lulus Seleksi' | 'Cadangan' | 'Tidak Diterima';
  registeredAt: string;
  committeeNotes?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'Baru' | 'Dibaca' | 'Dibalas';
  replyMessage?: string;
  repliedAt?: string;
  repliedBy?: string;
}

export interface ContactInfo {
  address: string;
  phone: string;
  whatsapp: string;
  publicEmail: string;
  ppdbEmail: string;
  weekdayHours: string;
  fridayHours: string;
  footerHours: string;
  instagramUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
}

export interface Announcement {
  id: string;
  title: string;
  category: 'Akademik' | 'Prestasi' | 'PPDB' | 'Kegiatan' | 'Umum';
  date: string;
  author: string;
  summary: string;
  content: string;
  image?: string;
  images?: string[];
  isImportant?: boolean;
  createdAt?: string;
}

export interface PortalAnnouncement {
  id: string;
  title: string;
  category: 'Umum' | 'Kelas X' | 'Kelas XI' | 'Kelas XII';
  targetClass?: string;
  content: string;
  teacherId: string;
  teacherName: string;
  createdAt: string;
  isImportant?: boolean;
}

export interface SubjectAnnouncement {
  id: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  classId: string; // e.g. "XII-A", "XI-B", or "Semua Kelas"
  className: string;
  title: string;
  type: 'Guru Berhalangan & Tugas Pengganti' | 'Instruksi Materi' | 'Perubahan Jadwal Mapel' | 'Info Ulangan / Praktikum';
  content: string;
  date: string;
  isUrgent?: boolean;
  linkedAssignmentId?: string;
  createdAt: string;
}

export interface Assignment {
  id: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  title: string;
  description: string;
  deadline: string; // e.g. "05 Oktober 2026, 23:59 WIT"
  maxScore: number;
  attachmentName?: string;
  createdAt: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentNisn: string;
  classId: string;
  submittedAt: string;
  submissionType: 'file' | 'link' | 'text';
  fileName?: string;
  fileSize?: string;
  linkOrContent: string;
  status: 'Terkumpul' | 'Terlambat' | 'Dinilai';
  score?: number;
  feedback?: string;
  gradedAt?: string;
  gradedBy?: string;
}



export interface GalleryPhoto {
  id: string;
  title: string;
  category: 'Akademik' | 'Prestasi' | 'Ekstrakurikuler' | 'Olahraga' | 'Sosialisasi' | 'Upacara';
  date: string;
  image: string;
  additionalImages?: string[];
  description: string;
  photographer: string;
  createdAt?: string;
}

export interface KombelActivity {
  id: string;
  title: string;
  date: string;
  image: string;
  additionalImages?: string[];
  description: string;
  speaker?: string;
  attendeesCount?: number;
  createdAt: string;
}

export interface KombelAgenda {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  moderator?: string;
  createdAt: string;
}

export interface KombelInfo {
  routineTitle: string;
  routineDescription: string;
  venueTitle: string;
  venueDescription: string;
  purposeTitle: string;
  purposeDescription: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  category: 'Kegiatan' | 'Prestasi' | 'Pembelajaran' | 'Profil' | 'Umum';
  youtubeUrl: string;
  videoId: string;
  thumbnailUrl: string;
  description: string;
  date: string;
  createdAt: string;
}

export interface PasswordResetRequest {
  id: string;
  userId: string;
  username: string;
  tokenHash: string;
  expiresAt: number;
  used: boolean;
  requestedAt: string;
}

export interface PPDBStatusResult {
  registrationNumber: string;
  status: PPDBApplicant['status'];
  registeredAt: string;
}
