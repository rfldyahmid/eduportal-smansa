import type {
  UserAccount,
  Student,
  Teacher,
  ScheduleItem,
  PPDBApplicant,
  ContactMessage,
  ContactInfo,
  Announcement,
  GalleryPhoto,
  YouTubeVideo,
  KombelActivity,
  KombelAgenda,
  KombelInfo,
  Assignment,
  AssignmentSubmission,
  PortalAnnouncement,
  PasswordResetRequest
} from '../src/types/index';
import { DEFAULT_CONTACT_INFO } from '../src/utils/contactInfoDefaults';
import { DEFAULT_KOMBEL_INFO } from '../src/utils/kombelInfoDefaults';
import { listAnnouncements } from './repositories/announcements';
import { pool } from './pg';

export interface DatabaseSchema {
  users: UserAccount[];
  students: Student[];
  teachers: Teacher[];
  schedules: ScheduleItem[];
  ppdb: PPDBApplicant[];
  messages: ContactMessage[];
  contactInfo: ContactInfo;
  announcements: Announcement[];
  gallery: GalleryPhoto[];
  homeHeroSlides: string[];
  videos: YouTubeVideo[];
  kombelActivities: KombelActivity[];
  kombelAgendas: KombelAgenda[];
  kombelInfo: KombelInfo;
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  portalAnnouncements: PortalAnnouncement[];
  passwordResets: PasswordResetRequest[];
}

let dbInstance: DatabaseSchema | null = null;
let dbRevision = 0;
let writeQueue = Promise.resolve();

export async function getDb(): Promise<DatabaseSchema> {
  if (dbInstance) return dbInstance;

  const { rows } = await pool.query<{ state: Partial<DatabaseSchema>; revision: string }>(
    'SELECT state, revision FROM application_state WHERE id = 1'
  );
  if (!rows[0]) {
    throw new Error(
      'State aplikasi belum ada di PostgreSQL. Jalankan npm run db:bootstrap sebelum menjalankan server.'
    );
  }

  dbRevision = Number(rows[0].revision);
  dbInstance = ensureDefaults({
    ...rows[0].state,
    announcements: await listAnnouncements()
  });
  return dbInstance;
}

export async function saveDb(): Promise<void> {
  if (!dbInstance) return;

  const write = writeQueue.then(async () => {
    const { rows } = await pool.query<{ revision: string }>(
      `UPDATE application_state
       SET state = $1::jsonb, revision = revision + 1, updated_at = now()
       WHERE id = 1 AND revision = $2
       RETURNING revision`,
      [JSON.stringify(dbInstance), dbRevision]
    );
    if (!rows[0]) {
      throw new Error(
        'PostgreSQL state berubah di luar server ini. Jalankan hanya satu server instance dan restart sebelum menyimpan lagi.'
      );
    }
    dbRevision = Number(rows[0].revision);
  });

  writeQueue = write.then(() => undefined, () => undefined);
  return write;
}

export async function resetSchoolData(): Promise<{ removedUsers: number; removedFiles: number }> {
  const write = writeQueue.then(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.skip_trash', 'true', true)");
      const { rows } = await client.query<{ state: DatabaseSchema; revision: string }>(
        'SELECT state, revision FROM application_state WHERE id = 1 FOR UPDATE'
      );
      if (!rows[0]) throw new Error('State aplikasi tidak ditemukan di PostgreSQL.');

      const currentState = rows[0].state;
      const adminUsers = (Array.isArray(currentState.users) ? currentState.users : []).filter(user => user.role === 'admin');
      const removedUsers = (Array.isArray(currentState.users) ? currentState.users : []).length - adminUsers.length;
      const fileCount = await client.query<{ count: string }>('SELECT count(*)::text AS count FROM uploaded_files');

      const emptyState: DatabaseSchema = {
        users: adminUsers,
        students: [],
        teachers: [],
        schedules: [],
        ppdb: [],
        messages: [],
        contactInfo: {
          address: '', phone: '', whatsapp: '', publicEmail: '', ppdbEmail: '',
          weekdayHours: '', fridayHours: '', footerHours: '', instagramUrl: '', facebookUrl: '', youtubeUrl: ''
        },
        announcements: [],
        gallery: [],
        homeHeroSlides: [],
        videos: [],
        kombelActivities: [],
        kombelAgendas: [],
        kombelInfo: {
          routineTitle: '', routineDescription: '', venueTitle: '', venueDescription: '', purposeTitle: '', purposeDescription: ''
        },
        assignments: [],
        submissions: [],
        portalAnnouncements: [],
        passwordResets: []
      };

      const { rows: updatedRows } = await client.query<{ revision: string }>(
        `UPDATE application_state
         SET state = $1::jsonb, revision = revision + 1, updated_at = now()
         WHERE id = 1 AND revision = $2
         RETURNING revision`,
        [JSON.stringify(emptyState), rows[0].revision]
      );
      if (!updatedRows[0]) throw new Error('State aplikasi berubah saat proses reset. Coba ulangi.');
      await client.query('DELETE FROM announcements');
      await client.query('DELETE FROM uploaded_files');
      await client.query('DELETE FROM deleted_items');
      await client.query('COMMIT');

      dbInstance = emptyState;
      dbRevision = Number(updatedRows[0].revision);
      return { removedUsers, removedFiles: Number(fileCount.rows[0]?.count || 0) };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  });

  writeQueue = write.then(() => undefined, () => undefined);
  return write;
}

export function ensureDefaults(data: Partial<DatabaseSchema>): DatabaseSchema {
  const students = Array.isArray(data.students) ? data.students : [];
  const teachers = Array.isArray(data.teachers) ? data.teachers : [];
  return {
    users: Array.isArray(data.users) ? data.users : [],
    students,
    teachers: teachers.map(teacher => {
      if (typeof teacher.homeroomClass === 'string') return teacher;
      const assignedClasses = new Set(
        students
          .filter(student => student.homeroomTeacher === teacher.fullName)
          .map(student => student.classId)
      );
      return assignedClasses.size === 1
        ? { ...teacher, homeroomClass: assignedClasses.values().next().value }
        : teacher;
    }),
    schedules: Array.isArray(data.schedules) ? data.schedules : [],
    ppdb: Array.isArray(data.ppdb) ? data.ppdb : [],
    messages: Array.isArray(data.messages) ? data.messages : [],
    contactInfo: { ...DEFAULT_CONTACT_INFO, ...(data.contactInfo || {}) },
    announcements: Array.isArray(data.announcements) ? data.announcements : [],
    gallery: Array.isArray(data.gallery) ? data.gallery : [],
    homeHeroSlides: Array.isArray(data.homeHeroSlides) ? data.homeHeroSlides : [],
    videos: Array.isArray(data.videos) ? data.videos : [],
    kombelActivities: Array.isArray(data.kombelActivities) ? data.kombelActivities : [],
    kombelAgendas: Array.isArray(data.kombelAgendas) ? data.kombelAgendas : [],
    kombelInfo: { ...DEFAULT_KOMBEL_INFO, ...(data.kombelInfo || {}) },
    assignments: Array.isArray(data.assignments) ? data.assignments : [],
    submissions: Array.isArray(data.submissions) ? data.submissions : [],
    portalAnnouncements: Array.isArray(data.portalAnnouncements) ? data.portalAnnouncements : [],
    passwordResets: Array.isArray(data.passwordResets) ? data.passwordResets : []
  };
}
