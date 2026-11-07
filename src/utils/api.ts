import {
  Announcement,
  GalleryPhoto,
  YouTubeVideo,
  KombelActivity,
  KombelAgenda,
  KombelInfo,
  Teacher,
  Student,
  ScheduleItem,
  PPDBApplicant,
  PPDBStatusResult,
  ContactMessage,
  ContactInfo,
  Assignment,
  AssignmentSubmission,
  PortalAnnouncement,
  UserAccount,
  UserRole
} from '../types';
import type { StudentImportRow, TeacherImportRow } from './rosterExcel';

const API_BASE = '/api';
const AUTH_TOKEN_KEY = 'sman1halteng_auth_token';

export function getAuthToken(): string {
  return sessionStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem('sman1halteng_admin_token') || '';
}

export function hasAuthToken(): boolean {
  return Boolean(getAuthToken());
}

export function setAuthToken(token: string): void {
  sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  sessionStorage.setItem('sman1halteng_admin_token', token);
}

export function clearAuthToken(): void {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem('sman1halteng_admin_token');
}

export function getAdminToken(): string {
  return getAuthToken();
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error('Tidak dapat terhubung ke backend EDUPORTAL. Pastikan server berjalan dan website dibuka dari alamat server yang sama, bukan dari file lokal atau Live Server.');
  }
  if (res.status === 204) return undefined as unknown as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.message || 'Permintaan ke server gagal.';
    if (res.status === 404 && message === 'Endpoint API tidak ditemukan.') {
      throw new Error(`${message} (${options.method || 'GET'} ${API_BASE}${path}). Mulai ulang atau build ulang server agar rute terbaru dimuat.`);
    }
    throw new Error(message);
  }
  return data;
}

// ---------------- AUTHENTICATION ----------------
export async function apiLogin(username: string, password: string): Promise<{ token: string; user: UserAccount }> {
  const data = await apiRequest<{ token: string; user: UserAccount }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  setAuthToken(data.token);
  return data;
}

export async function apiAdminLogin(username: string, password: string): Promise<{ token: string }> {
  const res = await apiLogin(username, password);
  return { token: res.token };
}

export async function apiGetMe(): Promise<UserAccount> {
  return apiRequest<UserAccount>('/auth/me');
}

export async function apiChangePassword(oldPassword: string, newPassword: string): Promise<{ message: string; token: string; user: UserAccount }> {
  const result = await apiRequest<{ message: string; token: string; user: UserAccount }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword })
  });
  setAuthToken(result.token);
  return result;
}

export async function apiForgotPassword(usernameOrEmail: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ usernameOrEmail })
  });
}

export async function apiResetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword })
  });
}

export async function apiAdminResetPassword(userId: string, tempPassword: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/admin-reset-password', {
    method: 'POST',
    body: JSON.stringify({ userId, tempPassword })
  });
}

export async function fetchUsers(): Promise<UserAccount[]> {
  return apiRequest<UserAccount[]>('/users');
}

export async function createManagedUser(input: {
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
}): Promise<{ user: UserAccount; temporaryPassword: string; message: string }> {
  return apiRequest('/users', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateManagedUser(id: string, input: {
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
}): Promise<{ user: UserAccount; message: string }> {
  return apiRequest(`/users/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) });
}

export async function bulkDeleteManagedUsers(ids: string[]): Promise<{ message: string; removedCount: number }> {
  return apiRequest('/users', { method: 'DELETE', body: JSON.stringify({ ids }) });
}

export type BulkDeleteCollection =
  | 'students'
  | 'teachers'
  | 'ppdb'
  | 'announcements'
  | 'gallery'
  | 'videos'
  | 'kombelActivities'
  | 'kombelAgendas'
  | 'messages'
  | 'assignments'
  | 'submissions'
  | 'portalAnnouncements';

export async function bulkDeleteAdminItems(
  collection: BulkDeleteCollection,
  ids: string[]
): Promise<{ message: string; removedCount: number }> {
  return apiRequest(collection === 'announcements' ? '/announcements/bulk-delete' : '/admin/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ collection, ids })
  });
}

export async function syncAdminRoster(payload: {
  students: StudentImportRow[];
  teachers: TeacherImportRow[];
}): Promise<{ message: string; students: { created: number; updated: number }; teachers: { created: number; updated: number } }> {
  return apiRequest('/admin/roster/import', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export interface ProvisionLinkedAccountsResult {
  created: { fullName: string; role: 'siswa' | 'guru'; username: string; temporaryPassword: string }[];
  conflicts: { fullName: string; role: 'siswa' | 'guru'; username: string }[];
  profiles: { siswa: number; guru: number };
  accounts: { siswa: number; guru: number };
}

export interface DeletedItemSummary {
  id: string;
  type: string;
  itemId: string;
  deletedAt: string;
  label: string;
  summary: string;
}

export async function fetchTrash(): Promise<DeletedItemSummary[]> {
  return apiRequest('/admin/trash');
}

export async function restoreTrashItem(id: string): Promise<{ message: string }> {
  return apiRequest(`/admin/trash/${encodeURIComponent(id)}/restore`, { method: 'POST', body: '{}' });
}

export async function restoreSelectedTrashItems(ids: string[]): Promise<{
  message: string;
  restoredCount: number;
  skippedCount: number;
}> {
  let restoredCount = 0;
  let skippedCount = 0;
  for (let index = 0; index < ids.length; index += 500) {
    const result = await apiRequest<{ message: string; restoredCount: number; skippedCount: number }>(
      '/admin/trash/restore-selected',
      { method: 'POST', body: JSON.stringify({ ids: ids.slice(index, index + 500) }) }
    );
    restoredCount += result.restoredCount;
    skippedCount += result.skippedCount;
  }
  return {
    message: skippedCount
      ? `${restoredCount} item berhasil dipulihkan. ${skippedCount} item tidak dipulihkan karena konflik atau jenisnya belum didukung.`
      : `${restoredCount} item berhasil dipulihkan.`,
    restoredCount,
    skippedCount
  };
}

export async function permanentlyDeleteTrashItem(id: string): Promise<void> {
  await apiRequest(`/admin/trash/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function permanentlyDeleteSelectedTrashItems(ids: string[]): Promise<{ message: string; removedCount: number }> {
  return apiRequest('/admin/trash/bulk', {
    method: 'DELETE',
    body: JSON.stringify({ ids })
  });
}

export async function provisionLinkedAccounts(): Promise<ProvisionLinkedAccountsResult> {
  return apiRequest<ProvisionLinkedAccountsResult>('/users/provision-linked-accounts', {
    method: 'POST',
    body: JSON.stringify({})
  });
}

export async function resetSchoolData(confirmation: string): Promise<{
  message: string;
  removedUsers: number;
  removedFiles: number;
}> {
  return apiRequest('/admin/reset-school-data', {
    method: 'POST',
    body: JSON.stringify({ confirmation })
  });
}

// ---------------- ANNOUNCEMENTS ----------------
export async function fetchAnnouncements(): Promise<Announcement[]> {
  const data: unknown = await apiRequest<unknown>('/announcements');
  if (!Array.isArray(data)) {
    throw new Error('Respons API pengumuman tidak valid: server seharusnya mengirim array.');
  }
  return data.filter((item): item is Announcement =>
    !!item &&
    typeof item === 'object' &&
    typeof (item as Announcement).id === 'string' &&
    typeof (item as Announcement).title === 'string'
  );
}

export async function createAnnouncement(payload: Omit<Announcement, 'id'>): Promise<Announcement> {
  return apiRequest<Announcement>('/announcements', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateAnnouncement(item: Announcement): Promise<Announcement> {
  return apiRequest<Announcement>(`/announcements/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function removeAnnouncement(id: string): Promise<void> {
  await apiRequest(`/announcements/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---------------- GALLERY (FOTO) ----------------
export async function fetchGallery(): Promise<GalleryPhoto[]> {
  return apiRequest<GalleryPhoto[]>('/gallery');
}

export async function createGalleryPhoto(payload: Omit<GalleryPhoto, 'id'>): Promise<GalleryPhoto> {
  return apiRequest<GalleryPhoto>('/gallery', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateGalleryPhoto(item: GalleryPhoto): Promise<GalleryPhoto> {
  return apiRequest<GalleryPhoto>(`/gallery/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function removeGalleryPhoto(id: string): Promise<void> {
  await apiRequest(`/gallery/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---------------- HOME HERO SLIDES ----------------
export async function fetchHomeHeroSlides(): Promise<string[]> {
  return apiRequest<string[]>('/home-hero');
}

export async function updateHomeHeroSlides(images: string[]): Promise<string[]> {
  return apiRequest<string[]>('/home-hero', {
    method: 'PUT',
    body: JSON.stringify({ images })
  });
}

// ---------------- YOUTUBE VIDEOS ----------------
export async function fetchVideos(): Promise<YouTubeVideo[]> {
  return apiRequest<YouTubeVideo[]>('/videos');
}

export async function createVideo(payload: { title: string; category?: string; youtubeUrl: string; description?: string; date?: string }): Promise<YouTubeVideo> {
  return apiRequest<YouTubeVideo>('/videos', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateVideo(item: YouTubeVideo): Promise<YouTubeVideo> {
  return apiRequest<YouTubeVideo>(`/videos/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function removeVideo(id: string): Promise<void> {
  await apiRequest(`/videos/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---------------- KOMBEL ----------------
export async function fetchKombelInfo(): Promise<KombelInfo> {
  return apiRequest<KombelInfo>('/kombel/info');
}

export async function updateKombelInfo(info: KombelInfo): Promise<KombelInfo> {
  return apiRequest<KombelInfo>('/kombel/info', {
    method: 'PUT',
    body: JSON.stringify(info)
  });
}

export async function fetchKombelActivities(): Promise<KombelActivity[]> {
  return apiRequest<KombelActivity[]>('/kombel/activities');
}

export async function createKombelActivity(payload: Omit<KombelActivity, 'id' | 'createdAt'>): Promise<KombelActivity> {
  return apiRequest<KombelActivity>('/kombel/activities', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateKombelActivity(item: KombelActivity): Promise<KombelActivity> {
  return apiRequest<KombelActivity>(`/kombel/activities/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function removeKombelActivity(id: string): Promise<void> {
  await apiRequest(`/kombel/activities/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function fetchKombelAgendas(): Promise<KombelAgenda[]> {
  return apiRequest<KombelAgenda[]>('/kombel/agendas');
}

export async function createKombelAgenda(payload: Omit<KombelAgenda, 'id' | 'createdAt'>): Promise<KombelAgenda> {
  return apiRequest<KombelAgenda>('/kombel/agendas', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateKombelAgenda(item: KombelAgenda): Promise<KombelAgenda> {
  return apiRequest<KombelAgenda>(`/kombel/agendas/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function removeKombelAgenda(id: string): Promise<void> {
  await apiRequest(`/kombel/agendas/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---------------- TEACHERS (GURU) ----------------
export async function fetchTeachers(): Promise<Teacher[]> {
  return apiRequest<Teacher[]>('/teachers');
}

export async function createTeacher(payload: Omit<Teacher, 'id'>): Promise<{ item: Teacher; username: string; temporaryPassword: string }> {
  return apiRequest<{ item: Teacher; username: string; temporaryPassword: string }>('/teachers', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateTeacher(item: Teacher): Promise<Teacher> {
  return apiRequest<Teacher>(`/teachers/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function removeTeacher(id: string): Promise<void> {
  await apiRequest(`/teachers/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---------------- STUDENTS (SISWA) ----------------
export async function fetchStudents(): Promise<Student[]> {
  return apiRequest<Student[]>('/students');
}

export async function fetchMyStudentProfile(): Promise<Student> {
  return apiRequest<Student>('/student/profile');
}

export async function fetchStudentNotificationReads(): Promise<string[]> {
  return apiRequest<string[]>('/student/notification-reads');
}

export async function markStudentNotificationsRead(keys: string[]): Promise<void> {
  await apiRequest<void>('/student/notification-reads', {
    method: 'POST',
    body: JSON.stringify({ keys })
  });
}

export async function createStudent(payload: Omit<Student, 'id'>): Promise<{ item: Student; username: string; temporaryPassword: string }> {
  return apiRequest<{ item: Student; username: string; temporaryPassword: string }>('/students', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateStudent(item: Student): Promise<Student> {
  return apiRequest<Student>(`/students/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function removeStudent(id: string): Promise<void> {
  await apiRequest(`/students/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---------------- SCHEDULES (JADWAL) ----------------
export async function fetchSchedules(): Promise<ScheduleItem[]> {
  return apiRequest<ScheduleItem[]>('/schedules');
}

export async function createSchedule(item: Omit<ScheduleItem, 'id'>): Promise<ScheduleItem> {
  return apiRequest<ScheduleItem>('/schedules', {
    method: 'POST',
    body: JSON.stringify(item)
  });
}

export async function updateSchedule(item: ScheduleItem): Promise<ScheduleItem> {
  return apiRequest<ScheduleItem>(`/schedules/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function removeSchedule(id: string): Promise<void> {
  await apiRequest(`/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---------------- PPDB ----------------
export async function fetchPPDB(): Promise<PPDBApplicant[]> {
  return apiRequest<PPDBApplicant[]>('/ppdb');
}

export async function createPPDBApplicant(payload: Partial<PPDBApplicant>): Promise<PPDBApplicant> {
  return apiRequest<PPDBApplicant>('/ppdb', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function searchPPDBApplicant(registrationNumber: string, nisn: string): Promise<PPDBStatusResult> {
  return apiRequest<PPDBStatusResult>('/ppdb/status', {
    method: 'POST',
    body: JSON.stringify({ registrationNumber, nisn })
  });
}

export async function updatePPDBApplicant(item: PPDBApplicant): Promise<PPDBApplicant> {
  return apiRequest<PPDBApplicant>(`/ppdb/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function removePPDBApplicant(id: string): Promise<void> {
  await apiRequest(`/ppdb/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---------------- CONTACT MESSAGES ----------------
export async function sendContactMessage(payload: { name: string; email: string; phone?: string; subject?: string; message: string }): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/contact', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchContactMessages(): Promise<ContactMessage[]> {
  return apiRequest<ContactMessage[]>('/contact');
}

export async function fetchContactInfo(): Promise<ContactInfo> {
  return apiRequest<ContactInfo>('/contact-info');
}

export async function updateContactInfo(contactInfo: ContactInfo): Promise<ContactInfo> {
  return apiRequest<ContactInfo>('/contact-info', {
    method: 'PUT',
    body: JSON.stringify(contactInfo)
  });
}

export async function updateContactMessage(item: ContactMessage): Promise<ContactMessage> {
  return apiRequest<ContactMessage>(`/contact/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function replyToContactMessage(id: string, replyMessage: string): Promise<ContactMessage> {
  return apiRequest<ContactMessage>(`/contact/${encodeURIComponent(id)}/reply`, {
    method: 'POST',
    body: JSON.stringify({ replyMessage })
  });
}

export async function removeContactMessage(id: string): Promise<void> {
  await apiRequest(`/contact/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---------------- ASSIGNMENTS (TUGAS) ----------------
export async function fetchAssignments(filter?: { classId?: string; teacherId?: string }): Promise<Assignment[]> {
  const params = new URLSearchParams();
  if (filter?.classId) params.set('classId', filter.classId);
  if (filter?.teacherId) params.set('teacherId', filter.teacherId);
  const q = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<Assignment[]>(`/assignments${q}`);
}

export async function createAssignment(payload: Omit<Assignment, 'id' | 'createdAt'>): Promise<Assignment> {
  return apiRequest<Assignment>('/assignments', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateAssignment(item: Assignment): Promise<Assignment> {
  return apiRequest<Assignment>(`/assignments/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function removeAssignment(id: string): Promise<void> {
  await apiRequest(`/assignments/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---------------- PORTAL ANNOUNCEMENTS ----------------
export async function fetchPortalAnnouncements(): Promise<PortalAnnouncement[]> {
  return apiRequest<PortalAnnouncement[]>('/portal-announcements');
}

export async function savePortalAnnouncementApi(item: PortalAnnouncement): Promise<PortalAnnouncement> {
  const isUpdate = Boolean(item.id);
  return apiRequest<PortalAnnouncement>(
    isUpdate ? `/portal-announcements/${encodeURIComponent(item.id)}` : '/portal-announcements',
    {
      method: isUpdate ? 'PUT' : 'POST',
      body: JSON.stringify(item)
    }
  );
}

export async function removePortalAnnouncementApi(id: string): Promise<void> {
  await apiRequest(`/portal-announcements/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ---------------- SUBMISSIONS ----------------
export async function fetchSubmissions(filter?: { assignmentId?: string; studentId?: string }): Promise<AssignmentSubmission[]> {
  const params = new URLSearchParams();
  if (filter?.assignmentId) params.set('assignmentId', filter.assignmentId);
  if (filter?.studentId) params.set('studentId', filter.studentId);
  const q = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<AssignmentSubmission[]>(`/submissions${q}`);
}

export async function downloadSubmissionFile(submissionId: string, fileName?: string): Promise<void> {
  const headers = new Headers();
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}/submissions/${encodeURIComponent(submissionId)}/file`, { headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Berkas tugas tidak dapat diunduh.');
  }

  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName || `jawaban-${submissionId}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export async function submitAssignment(payload: { assignmentId: string; submissionType?: 'text' | 'link' | 'file'; linkOrContent: string; file?: File }): Promise<AssignmentSubmission> {
  if (payload.file) {
    const formData = new FormData();
    formData.append('assignmentId', payload.assignmentId);
    formData.append('submissionType', payload.submissionType || 'file');
    formData.append('linkOrContent', payload.linkOrContent);
    formData.append('file', payload.file);
    return apiRequest<AssignmentSubmission>('/submissions', {
      method: 'POST',
      body: formData
    });
  }

  return apiRequest<AssignmentSubmission>('/submissions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function gradeSubmission(submissionId: string, payload: { score: number; feedback?: string }): Promise<AssignmentSubmission> {
  return apiRequest<AssignmentSubmission>(`/submissions/${encodeURIComponent(submissionId)}/grade`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

// Utility: Read File to Base64
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });
}
