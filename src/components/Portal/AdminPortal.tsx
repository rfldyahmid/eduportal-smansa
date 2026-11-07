import React, { useState, useEffect, useRef } from 'react';
import {
  Student,
  Teacher,
  PPDBApplicant,
  ContactMessage,
  ContactInfo,
  UserAccount,
  Announcement,
  GalleryPhoto,
  YouTubeVideo,
  KombelActivity,
  KombelAgenda,
  Assignment,
  AssignmentSubmission,
  PortalAnnouncement,
  UserRole
} from '../../types';
import {
  fetchAnnouncements,
  createAnnouncement as apiCreateAnnouncement,
  updateAnnouncement as apiUpdateAnnouncement,
  removeAnnouncement as apiRemoveAnnouncement,
  fetchGallery,
  fetchHomeHeroSlides,
  updateHomeHeroSlides,
  createGalleryPhoto,
  updateGalleryPhoto,
  removeGalleryPhoto,
  fetchVideos,
  createVideo,
  updateVideo,
  removeVideo,
  fetchKombelActivities,
  createKombelActivity,
  updateKombelActivity,
  removeKombelActivity,
  fetchKombelAgendas,
  createKombelAgenda,
  updateKombelAgenda,
  removeKombelAgenda,
  fetchTeachers,
  createTeacher,
  updateTeacher,
  removeTeacher,
  fetchStudents,
  createStudent,
  updateStudent,
  removeStudent,
  fetchPPDB,
  updatePPDBApplicant,
  removePPDBApplicant,
  fetchContactMessages,
  fetchContactInfo,
  fetchAssignments,
  fetchPortalAnnouncements,
  savePortalAnnouncementApi,
  removePortalAnnouncementApi,
  fetchSubmissions,
  downloadSubmissionFile,
  updateContactInfo as apiUpdateContactInfo,
  replyToContactMessage,
  removeContactMessage,
  fetchUsers,
  syncAdminRoster,
  bulkDeleteAdminItems,
  type BulkDeleteCollection,
  provisionLinkedAccounts,
  resetSchoolData as apiResetSchoolData,
  createManagedUser,
  updateManagedUser,
  bulkDeleteManagedUsers,
  fetchTrash,
  restoreTrashItem,
  restoreSelectedTrashItems,
  permanentlyDeleteTrashItem,
  permanentlyDeleteSelectedTrashItems,
  type DeletedItemSummary,
  apiAdminResetPassword,
  fileToDataUrl
} from '../../utils/api';
import {
  Users,
  UserPlus,
  FileCheck,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  MessageSquare,
  X,
  Filter,
  GraduationCap,
  Bell,
  PlusCircle,
  Calendar,
  Images,
  ImagePlus,
  Video,
  Play,
  BookOpen,
  Key,
  Lock,
  Shield,
  Copy,
  Check,
  Clock,
  UserCheck,
  ExternalLink,
  HelpCircle,
  Layers,
  ChevronLeft,
  ChevronRight,
  Send,
  Contact,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { DEFAULT_CONTACT_INFO, CONTACT_INFO_UPDATED_EVENT } from '../../utils/contactInfo';
import { SCHOOL_CLASSES } from '../../utils/schoolClasses';

interface AdminPortalProps {
  currentUser: UserAccount;
  onLogout: () => void;
  onNavigate?: (tab: string) => void;
}

type AdminTab =
  | 'siswa'
  | 'guru'
  | 'ppdb'
  | 'pengumuman'
  | 'galeri'
  | 'video'
  | 'kombel'
  | 'internal'
  | 'pesan'
  | 'kontak'
  | 'pengguna'
  | 'sampah';

const contactInfoFields: { key: keyof ContactInfo; label: string; type?: string; multiline?: boolean }[] = [
  { key: 'address', label: 'Alamat sekolah', multiline: true },
  { key: 'phone', label: 'Telepon tata usaha', type: 'tel' },
  { key: 'whatsapp', label: 'Nomor WhatsApp PPDB', type: 'tel' },
  { key: 'publicEmail', label: 'Email humas', type: 'email' },
  { key: 'ppdbEmail', label: 'Email PPDB', type: 'email' },
  { key: 'weekdayHours', label: 'Jam pelayanan Senin–Kamis' },
  { key: 'fridayHours', label: 'Jam pelayanan Jumat' },
  { key: 'footerHours', label: 'Jam operasional di footer' },
  { key: 'instagramUrl', label: 'Tautan Instagram', type: 'url' },
  { key: 'facebookUrl', label: 'Tautan Facebook', type: 'url' },
  { key: 'youtubeUrl', label: 'Tautan YouTube', type: 'url' }
];

const toDateInputValue = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const announcementDateToInputValue = (value: string) => {
  const isoDate = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];

  const localizedDate = value.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i);
  if (localizedDate) {
    const months: Record<string, string> = {
      januari: '01',
      februari: '02',
      maret: '03',
      april: '04',
      mei: '05',
      juni: '06',
      juli: '07',
      agustus: '08',
      september: '09',
      oktober: '10',
      november: '11',
      desember: '12'
    };
    const month = months[localizedDate[2].toLowerCase()];
    if (month) return `${localizedDate[3]}-${month}-${localizedDate[1].padStart(2, '0')}`;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? toDateInputValue() : toDateInputValue(parsedDate);
};

const formatAnnouncementDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export const AdminPortal: React.FC<AdminPortalProps> = ({ currentUser, onLogout, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('siswa');

  // ---------------- STUDENTS STATE ----------------
  const [students, setStudents] = useState<Student[]>([]);
  const [searchStudent, setSearchStudent] = useState('');
  const [filterClass, setFilterClass] = useState('Semua');
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentForm, setStudentForm] = useState({
    fullName: '',
    email: '',
    nisn: '',
    nis: '',
    gender: 'Laki-laki' as 'Laki-laki' | 'Perempuan',
    classId: 'X-A',
    className: 'X-A',
    homeroomTeacher: 'Dra. Sri Wahyuni, M.Si'
  });

  // ---------------- TEACHERS STATE ----------------
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchTeacher, setSearchTeacher] = useState('');
  const [filterDept, setFilterDept] = useState('Semua');
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherForm, setTeacherForm] = useState({
    nip: '',
    fullName: '',
    degree: '',
    subject: '',
    department: 'MIPA' as Teacher['department'],
    classesTaught: ['X-A'],
    homeroomClass: '',
    education: '',
    email: '',
    phone: '',
    photoUrl: '',
    bio: ''
  });
  const homeroomClassOptions = SCHOOL_CLASSES;

  // ---------------- PPDB APPLICANTS STATE ----------------
  const [applicants, setApplicants] = useState<PPDBApplicant[]>([]);
  const [searchPPDB, setSearchPPDB] = useState('');
  const [selectedApplicant, setSelectedApplicant] = useState<PPDBApplicant | null>(null);
  const [committeeNotesDraft, setCommitteeNotesDraft] = useState('');
  const [isUpdatingPPDB, setIsUpdatingPPDB] = useState(false);
  const [ppdbActionError, setPpdbActionError] = useState('');

  // ---------------- MESSAGES STATE ----------------
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [searchMessage, setSearchMessage] = useState('');
  const [replyingMessageId, setReplyingMessageId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [sendingReplyId, setSendingReplyId] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo>(DEFAULT_CONTACT_INFO);
  const [isSavingContactInfo, setIsSavingContactInfo] = useState(false);

  // ---------------- INFORMASI INTERNAL GURU & SISWA ----------------
  const [internalAssignments, setInternalAssignments] = useState<Assignment[]>([]);
  const [internalAnnouncements, setInternalAnnouncements] = useState<PortalAnnouncement[]>([]);
  const [internalSubmissions, setInternalSubmissions] = useState<AssignmentSubmission[]>([]);
  const [internalSubTab, setInternalSubTab] = useState<'pengumuman' | 'tugas' | 'pengumpulan'>('pengumuman');
  const [internalSearch, setInternalSearch] = useState('');
  const [internalLoadError, setInternalLoadError] = useState('');
  const [internalActionError, setInternalActionError] = useState('');
  const [isInternalAnnouncementFormOpen, setIsInternalAnnouncementFormOpen] = useState(false);
  const [isSavingInternalAnnouncement, setIsSavingInternalAnnouncement] = useState(false);
  const [editingInternalAnnouncement, setEditingInternalAnnouncement] = useState<PortalAnnouncement | null>(null);
  const [internalAnnouncementForm, setInternalAnnouncementForm] = useState({
    title: '',
    category: 'Umum' as PortalAnnouncement['category'],
    content: '',
    isImportant: false
  });
  const [downloadingSubmissionId, setDownloadingSubmissionId] = useState<string | null>(null);

  // ---------------- ANNOUNCEMENTS STATE ----------------
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [searchAnnouncement, setSearchAnnouncement] = useState('');
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    category: 'Akademik' as Announcement['category'],
    date: toDateInputValue(),
    author: 'Tim Humas & Kurikulum',
    summary: '',
    content: '',
    images: [] as string[]
  });

  // ---------------- GALLERY (FOTO) STATE ----------------
  const [galleryItems, setGalleryItems] = useState<GalleryPhoto[]>([]);
  const [homeHeroSlides, setHomeHeroSlides] = useState<string[]>([]);
  const [isSavingHomeHero, setIsSavingHomeHero] = useState(false);
  const [galleryForm, setGalleryForm] = useState({
    title: '',
    category: 'Akademik' as GalleryPhoto['category'],
    description: '',
    photographer: 'Admin Sekolah'
  });
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [editingGallery, setEditingGallery] = useState<GalleryPhoto | null>(null);
  const [galleryEditForm, setGalleryEditForm] = useState({
    title: '',
    category: 'Akademik' as GalleryPhoto['category'],
    description: '',
    photographer: ''
  });
  const [galleryCoverFile, setGalleryCoverFile] = useState<File | null>(null);
  const [galleryAdditionalFiles, setGalleryAdditionalFiles] = useState<File[]>([]);
  const [isSavingGalleryEdit, setIsSavingGalleryEdit] = useState(false);

  // ---------------- VIDEOS (YOUTUBE) STATE ----------------
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [searchVideo, setSearchVideo] = useState('');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<YouTubeVideo | null>(null);
  const [videoForm, setVideoForm] = useState({
    title: '',
    category: 'Kegiatan' as YouTubeVideo['category'],
    youtubeUrl: '',
    description: '',
    date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  });

  // ---------------- KOMBEL (ACTIVITIES & AGENDAS) STATE ----------------
  const [kombelSubTab, setKombelSubTab] = useState<'kegiatan' | 'agenda'>('kegiatan');
  const [kombelActivities, setKombelActivities] = useState<KombelActivity[]>([]);
  const [kombelAgendas, setKombelAgendas] = useState<KombelAgenda[]>([]);
  const [isKombelActivityModalOpen, setIsKombelActivityModalOpen] = useState(false);
  const [editingKombelActivity, setEditingKombelActivity] = useState<KombelActivity | null>(null);
  const [kombelActivityForm, setKombelActivityForm] = useState({
    title: '',
    date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    image: '',
    description: '',
    speaker: '',
    attendeesCount: 20
  });
  const [kombelActivityImages, setKombelActivityImages] = useState<string[]>([]);

  const [isKombelAgendaModalOpen, setIsKombelAgendaModalOpen] = useState(false);
  const [editingKombelAgenda, setEditingKombelAgenda] = useState<KombelAgenda | null>(null);
  const [kombelAgendaForm, setKombelAgendaForm] = useState({
    title: '',
    date: 'Setiap Sabtu Rutin',
    time: '09:00 - 11:30 WIT',
    location: 'Ruang Guru SMAN 1 Halmahera Tengah',
    description: '',
    moderator: 'Lukman Hi. Saleh, S.Pd (Ketua KOMBEL)'
  });

  // ---------------- USERS & PASSWORD RESET STATE ----------------
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [filterUserRole, setFilterUserRole] = useState('Semua');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserAccount | null>(null);
  const [tempPasswordInput, setTempPasswordInput] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [isProvisioningAccounts, setIsProvisioningAccounts] = useState(false);
  const [isResettingSchoolData, setIsResettingSchoolData] = useState(false);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUserAccount, setEditingUserAccount] = useState<UserAccount | null>(null);
  const [isSavingUserAccount, setIsSavingUserAccount] = useState(false);
  const [userAccountForm, setUserAccountForm] = useState({
    username: '', fullName: '', email: '', role: 'siswa' as UserRole
  });
  const rosterFileInputRef = useRef<HTMLInputElement>(null);
  const [isImportingRoster, setIsImportingRoster] = useState(false);
  const [isBulkAccountDeleteMode, setIsBulkAccountDeleteMode] = useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [isDeletingAccounts, setIsDeletingAccounts] = useState(false);
  const [bulkDeleteCollection, setBulkDeleteCollection] = useState<BulkDeleteCollection | null>(null);
  const [selectedBulkIds, setSelectedBulkIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [trashItems, setTrashItems] = useState<DeletedItemSummary[]>([]);
  const [isLoadingTrash, setIsLoadingTrash] = useState(false);
  const [isTrashActionInProgress, setIsTrashActionInProgress] = useState(false);
  const [trashBulkAction, setTrashBulkAction] = useState<'restore' | 'delete' | null>(null);
  const [selectedTrashIds, setSelectedTrashIds] = useState<Set<string>>(new Set());

  // Status sinkronisasi backend
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // ---------------- LOAD ALL CONTENT FROM BACKEND ----------------
  const loadAllServerData = async () => {
    setIsSyncing(true);
    try {
      const results = await Promise.allSettled([
        fetchStudents(),
        fetchTeachers(),
        fetchPPDB(),
        fetchAnnouncements(),
        fetchGallery(),
        fetchVideos(),
        fetchKombelActivities(),
        fetchKombelAgendas(),
        fetchContactMessages(),
        fetchUsers(),
        fetchContactInfo(),
        fetchAssignments(),
        fetchPortalAnnouncements(),
        fetchSubmissions(),
        fetchHomeHeroSlides()
      ]);
      if (results[0].status === 'fulfilled') {
        setStudents(results[0].value);
      }
      if (results[1].status === 'fulfilled') {
        setTeachers(results[1].value);
      }
      const ppdbResult = results[2];
      if (ppdbResult.status === 'fulfilled') {
        const loadedApplicants = ppdbResult.value;
        setApplicants(loadedApplicants);
        setSelectedApplicant(current => current
          ? loadedApplicants.find(applicant => applicant.id === current.id) || null
          : null);
      }
      if (results[3].status === 'fulfilled') {
        setAnnouncements(results[3].value);
      }
      if (results[4].status === 'fulfilled') {
        setGalleryItems(results[4].value);
      }
      if (results[5].status === 'fulfilled') {
        setVideos(results[5].value);
      }
      if (results[6].status === 'fulfilled') {
        setKombelActivities(results[6].value);
      }
      if (results[7].status === 'fulfilled') {
        setKombelAgendas(results[7].value);
      }
      if (results[8].status === 'fulfilled') {
        setMessages(results[8].value);
      }
      if (results[9].status === 'fulfilled') {
        setUsers(results[9].value);
      }
      if (results[10].status === 'fulfilled') {
        setContactInfo(results[10].value);
      }
      if (results[11].status === 'fulfilled') setInternalAssignments(results[11].value);
      if (results[12].status === 'fulfilled') setInternalAnnouncements(results[12].value);
      if (results[13].status === 'fulfilled') {
        setInternalSubmissions(results[13].value);
      }
      if (results[14].status === 'fulfilled') {
        setHomeHeroSlides(results[14].value);
      }
      if ([results[11], results[12], results[13]].some(result => result.status === 'rejected')) {
        setInternalLoadError('Data internal belum dapat dimuat. Periksa koneksi server, lalu muat ulang.');
      } else {
        setInternalLoadError('');
      }
      setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
    } catch (err) {
      console.warn('Sinkronisasi data server:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadTrash = async () => {
    setIsLoadingTrash(true);
    try {
      const items = await fetchTrash();
      const availableIds = new Set(items.map(item => item.id));
      setTrashItems(items);
      setSelectedTrashIds(current => new Set([...current].filter(id => availableIds.has(id))));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Gagal memuat tempat sampah.');
    } finally {
      setIsLoadingTrash(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sampah') loadTrash();
  }, [activeTab]);

  const handleRestoreTrashItem = async (item: DeletedItemSummary) => {
    if (isTrashActionInProgress || !window.confirm(`Pulihkan “${item.label}” ke data aktif?`)) return;
    setIsTrashActionInProgress(true);
    try {
      const result = await restoreTrashItem(item.id);
      window.alert(result.message);
      await loadTrash();
      await loadAllServerData();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Gagal memulihkan data.');
    } finally {
      setIsTrashActionInProgress(false);
    }
  };

  const handleRestoreSelectedTrashItems = async () => {
    if (isTrashActionInProgress || !selectedTrashIds.size) return;
    const ids = [...selectedTrashIds];
    if (!window.confirm(`Pulihkan ${ids.length} item terpilih? Data terkait seperti akun dan berkas juga dapat ikut dipulihkan.`)) return;
    setIsTrashActionInProgress(true);
    try {
      const result = await restoreSelectedTrashItems(ids);
      await loadTrash();
      await loadAllServerData();
      setSelectedTrashIds(new Set());
      setTrashBulkAction(null);
      window.alert(result.message);
    } catch (error) {
      await loadTrash();
      await loadAllServerData();
      window.alert(error instanceof Error ? error.message : 'Gagal memulihkan item terpilih.');
    } finally {
      setIsTrashActionInProgress(false);
    }
  };

  const handlePermanentlyDeleteTrashItem = async (item: DeletedItemSummary) => {
    if (isTrashActionInProgress || !window.confirm(`Hapus permanen “${item.label}”? Data ini tidak dapat dipulihkan setelahnya.`)) return;
    setIsTrashActionInProgress(true);
    try {
      await permanentlyDeleteTrashItem(item.id);
      await loadTrash();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Gagal menghapus data permanen.');
    } finally {
      setIsTrashActionInProgress(false);
    }
  };

  const handlePermanentlyDeleteSelectedTrashItems = async () => {
    if (isTrashActionInProgress || !selectedTrashIds.size) return;
    const ids = [...selectedTrashIds];
    if (!window.confirm(`Hapus permanen ${ids.length} item terpilih dari Tempat Sampah? Tindakan ini tidak dapat dibatalkan.`)) return;
    setIsTrashActionInProgress(true);
    try {
      const result = await permanentlyDeleteSelectedTrashItems(ids);
      setTrashItems(current => current.filter(item => !selectedTrashIds.has(item.id)));
      setSelectedTrashIds(new Set());
      setTrashBulkAction(null);
      window.alert(result.message);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Gagal menghapus item terpilih secara permanen.');
    } finally {
      setIsTrashActionInProgress(false);
    }
  };

  const visibleTrashIds = trashItems.map(item => item.id);
  const allTrashSelected = visibleTrashIds.length > 0 && visibleTrashIds.every(id => selectedTrashIds.has(id));

  useEffect(() => {
    loadAllServerData();
    const handleSync = () => loadAllServerData();
    window.addEventListener('storage-announcements-updated', handleSync);
    window.addEventListener('gallery-updated', handleSync);
    return () => {
      window.removeEventListener('storage-announcements-updated', handleSync);
      window.removeEventListener('gallery-updated', handleSync);
    };
  }, []);

  useEffect(() => {
    setBulkDeleteCollection(null);
    setSelectedBulkIds(new Set());
  }, [activeTab, internalSubTab, kombelSubTab]);

  // ---------------- STUDENTS CRUD ----------------
  const filteredStudents = students.filter(std => {
    const matchesClass = filterClass === 'Semua' || std.classId === filterClass;
    const matchesSearch =
      std.fullName.toLowerCase().includes(searchStudent.toLowerCase()) ||
      std.nisn.includes(searchStudent) ||
      std.nis.includes(searchStudent);
    return matchesClass && matchesSearch;
  });

  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setStudentForm({
      fullName: '',
      email: '',
      nisn: '',
      nis: '',
      gender: 'Laki-laki',
      classId: 'X-A',
      className: 'X-A',
      homeroomTeacher: 'Dra. Sri Wahyuni, M.Si'
    });
    setIsStudentModalOpen(true);
  };

  const handleOpenEditStudent = (std: Student) => {
    setEditingStudent(std);
    setStudentForm({
      fullName: std.fullName,
      email: std.email || '',
      nisn: std.nisn,
      nis: std.nis,
      gender: std.gender,
      classId: std.classId,
      className: std.className,
      homeroomTeacher: std.homeroomTeacher
    });
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.fullName || !studentForm.nisn) return;

    try {
      if (editingStudent) {
        const payload: Student = {
          ...editingStudent,
          ...studentForm
        };
        const updated = await updateStudent(payload);
        const next = students.map(s => (s.id === updated.id ? updated : s));
        setStudents(next);
      } else {
        const payload: Omit<Student, 'id'> = {
          ...studentForm,
          academicYear: '2026/2027'
        };
        const createdAccount = await createStudent(payload);
        const created = createdAccount.item;
        const next = [created, ...students];
        setStudents(next);
        window.alert(
          `Akun siswa berhasil dibuat. Simpan dan sampaikan kata sandi ini secara pribadi; kata sandi hanya ditampilkan sekali.\n\nUsername: ${createdAccount.username}\nKata sandi sementara: ${createdAccount.temporaryPassword}`
        );
      }
      setIsStudentModalOpen(false);
      loadAllServerData();
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan data siswa.');
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data siswa ini?')) return;
    try {
      await removeStudent(id);
      const next = students.filter(s => s.id !== id);
      setStudents(next);
      setUsers(current => current.filter(user => user.linkedId !== id));
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus siswa.');
    }
  };

  // ---------------- TEACHERS CRUD ----------------
  const filteredTeachers = teachers.filter(tch => {
    const matchesDept = filterDept === 'Semua' || tch.department === filterDept;
    const matchesSearch =
      tch.fullName.toLowerCase().includes(searchTeacher.toLowerCase()) ||
      tch.nip.includes(searchTeacher) ||
      tch.subject.toLowerCase().includes(searchTeacher.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const handleOpenAddTeacher = () => {
    setEditingTeacher(null);
    setTeacherForm({
      nip: '',
      fullName: '',
      degree: 'S.Pd',
      subject: '',
      department: 'MIPA',
      classesTaught: ['X-A'],
      homeroomClass: '',
      education: 'S1 Pendidikan, Universitas Khairun (Unkhair)',
      email: '',
      phone: '+62 812-',
      photoUrl: '',
      bio: 'Guru pembimbing berdedikasi tinggi di SMAN 1 Halmahera Tengah.'
    });
    setIsTeacherModalOpen(true);
  };

  const handleOpenEditTeacher = (tch: Teacher) => {
    setEditingTeacher(tch);
    setTeacherForm({
      nip: tch.nip,
      fullName: tch.fullName,
      degree: tch.degree,
      subject: tch.subject,
      department: tch.department,
      classesTaught: tch.classesTaught || [],
      homeroomClass: tch.homeroomClass || '',
      education: tch.education,
      email: tch.email,
      phone: tch.phone,
      photoUrl: tch.photoUrl,
      bio: tch.bio
    });
    setIsTeacherModalOpen(true);
  };

  const handleTeacherPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      alert('Pilih foto JPG atau PNG dengan ukuran maksimal 5 MB.');
      e.target.value = '';
      return;
    }
    try {
      const photoUrl = await fileToDataUrl(file);
      setTeacherForm(current => ({ ...current, photoUrl }));
    } catch {
      alert('Foto guru gagal dibaca. Silakan pilih file lain.');
    }
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.fullName || !teacherForm.nip || !teacherForm.subject) return;

    try {
      if (editingTeacher) {
        const payload: Teacher = {
          ...editingTeacher,
          ...teacherForm,
          nip: teacherForm.nip.replace(/\s+/g, ''),
          homeroomClass: teacherForm.homeroomClass
        };
        const updated = await updateTeacher(payload);
        setTeachers(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      } else {
        const payload: Omit<Teacher, 'id'> = {
          ...teacherForm,
          nip: teacherForm.nip.replace(/\s+/g, ''),
          homeroomClass: teacherForm.homeroomClass
        };
        const createdAccount = await createTeacher(payload);
        const created = createdAccount.item;
        setTeachers(prev => [created, ...prev]);
        window.alert(
          `Akun guru berhasil dibuat. Simpan dan sampaikan kata sandi ini secara pribadi; kata sandi hanya ditampilkan sekali.\n\nUsername: ${createdAccount.username}\nKata sandi sementara: ${createdAccount.temporaryPassword}`
        );
      }
      setIsTeacherModalOpen(false);
      loadAllServerData();
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan data guru.');
    }
  };

  const handleDownloadRosterTemplate = async () => {
    try {
      const { downloadRosterTemplate } = await import('../../utils/rosterExcel');
      await downloadRosterTemplate();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Gagal membuat template Excel.');
    }
  };

  const handleRosterFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || isImportingRoster) return;

    setIsImportingRoster(true);
    try {
      const { parseRosterWorkbook } = await import('../../utils/rosterExcel');
      const roster = await parseRosterWorkbook(file);
      const total = roster.students.length + roster.teachers.length;
      if (!window.confirm(
        `File berisi ${roster.students.length} siswa dan ${roster.teachers.length} guru/staf. ` +
        'Data akan ditambahkan atau diperbarui berdasarkan NISN/NIP. Data yang tidak ada di file tetap dipertahankan. ' +
        'Akun portal tidak dibuat. Lanjutkan sinkronisasi?'
      )) return;

      const result = await syncAdminRoster(roster);
      await loadAllServerData();
      window.alert(
        `${result.message}\nSiswa: ${result.students.created} ditambahkan, ${result.students.updated} diperbarui.\n` +
        `Guru/staf: ${result.teachers.created} ditambahkan, ${result.teachers.updated} diperbarui.\nTotal baris diproses: ${total}.`
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Gagal membaca atau menyinkronkan file Excel.');
    } finally {
      setIsImportingRoster(false);
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data pendidik ini?')) return;
    try {
      await removeTeacher(id);
      setTeachers(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus data guru.');
    }
  };

  // ---------------- PPDB APPLICANTS ----------------
  const filteredApplicants = applicants.filter(
    app =>
      app.fullName.toLowerCase().includes(searchPPDB.toLowerCase()) ||
      app.registrationNumber.toLowerCase().includes(searchPPDB.toLowerCase()) ||
      app.nisn.includes(searchPPDB)
  );

  const handleUpdatePPDBStatus = async (
    applicant: PPDBApplicant,
    status: PPDBApplicant['status'],
    notes?: string
  ) => {
    const updatedApp: PPDBApplicant = {
      ...applicant,
      status,
      committeeNotes: notes !== undefined ? notes : applicant.committeeNotes
    };
    setIsUpdatingPPDB(true);
    setPpdbActionError('');
    try {
      const savedApplicant = await updatePPDBApplicant(updatedApp);
      setApplicants(prev => prev.map(a => (a.id === savedApplicant.id ? savedApplicant : a)));
      setSelectedApplicant(savedApplicant);
      setCommitteeNotesDraft(savedApplicant.committeeNotes || '');
    } catch (err: any) {
      setPpdbActionError(err?.message || 'Perubahan PPDB gagal disimpan ke server.');
    } finally {
      setIsUpdatingPPDB(false);
    }
  };

  const handleDeletePPDB = async (id: string) => {
    if (!confirm('Hapus berkas pendaftar PPDB ini?')) return;
    try {
      await removePPDBApplicant(id);
      setApplicants(prev => prev.filter(a => a.id !== id));
      if (selectedApplicant?.id === id) {
        setSelectedApplicant(null);
        setCommitteeNotesDraft('');
      }
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus data PPDB.');
    }
  };

  // ---------------- ANNOUNCEMENTS ----------------
  const filteredAnnouncements = announcements.filter(
    item =>
      item.title.toLowerCase().includes(searchAnnouncement.toLowerCase()) ||
      item.category.toLowerCase().includes(searchAnnouncement.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchAnnouncement.toLowerCase())
  );

  const handleOpenAddAnnouncement = () => {
    setEditingAnnouncement(null);
    setAnnouncementForm({
      title: '',
      category: 'Akademik',
      date: toDateInputValue(),
      author: 'Tim Humas & Kurikulum',
      summary: '',
      content: '',
      images: []
    });
    setIsAnnouncementModalOpen(true);
  };

  const handleOpenEditAnnouncement = (item: Announcement) => {
    setEditingAnnouncement(item);
    setAnnouncementForm({
      title: item.title,
      category: item.category,
      date: announcementDateToInputValue(item.date),
      author: item.author,
      summary: item.summary,
      content: item.content,
      images: item.images?.length ? item.images : item.image ? [item.image] : []
    });
    setIsAnnouncementModalOpen(true);
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementForm.title || !announcementForm.summary || !announcementForm.content) return;
    const hasNewImages = announcementForm.images.some(image => image.startsWith('data:image/'));
    if (hasNewImages && (announcementForm.images.length < 3 || announcementForm.images.length > 5)) {
      alert('Unggah minimal 3 dan maksimal 5 foto untuk satu pengumuman.');
      return;
    }
    try {
      if (editingAnnouncement) {
        const updated = await apiUpdateAnnouncement({
          ...editingAnnouncement,
          ...announcementForm,
          date: formatAnnouncementDate(announcementForm.date)
        });
        setAnnouncements(prev => prev.map(item => (item.id === updated.id ? updated : item)));
      } else {
        const created = await apiCreateAnnouncement({
          ...announcementForm,
          date: formatAnnouncementDate(announcementForm.date),
          createdAt: new Date().toISOString()
        } as Omit<Announcement, 'id'>);
        setAnnouncements(prev => [created, ...prev]);
      }
      setIsAnnouncementModalOpen(false);
      window.dispatchEvent(new Event('storage-announcements-updated'));
    } catch (error: any) {
      alert(error?.message || 'Gagal menyimpan pengumuman ke server.');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengumuman ini dari website sekolah?')) return;
    try {
      await apiRemoveAnnouncement(id);
      setAnnouncements(prev => prev.filter(item => item.id !== id));
      window.dispatchEvent(new Event('storage-announcements-updated'));
    } catch (error: any) {
      alert(error?.message || 'Gagal menghapus pengumuman.');
    }
  };

  // ---------------- PHOTO GALLERY ----------------
  const handleUploadGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryForm.title || galleryFiles.length < 3 || galleryFiles.length > 5) {
      alert('Isi nama kegiatan dan pilih 3 sampai 5 foto.');
      return;
    }
    if (galleryFiles.reduce((total, file) => total + file.size, 0) > 8 * 1024 * 1024) {
      alert('Ukuran total foto maksimal 8 MB.');
      return;
    }
    setIsUploadingGallery(true);
    try {
      const images = await Promise.all(galleryFiles.map(fileToDataUrl));
      const created = await createGalleryPhoto({
        ...galleryForm,
        image: images[0],
        additionalImages: images.slice(1),
        date: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        createdAt: new Date().toISOString()
      });
      setGalleryItems(prev => [created, ...prev]);
      setGalleryFiles([]);
      setGalleryForm({
        title: '',
        category: 'Akademik',
        description: '',
        photographer: 'Admin Sekolah'
      });
      const input = document.getElementById('gallery-files-input') as HTMLInputElement | null;
      if (input) input.value = '';
      window.dispatchEvent(new Event('gallery-updated'));
      alert(`Kegiatan dengan ${images.length} foto berhasil masuk ke arsip ${created.category}.`);
    } catch (error: any) {
      alert(error?.message || 'Gagal mengunggah foto ke server.');
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const handleDeleteGallery = async (id: string) => {
    if (!confirm('Hapus foto ini dari arsip galeri?')) return;
    try {
      await removeGalleryPhoto(id);
      setGalleryItems(prev => prev.filter(item => item.id !== id));
      window.dispatchEvent(new Event('gallery-updated'));
    } catch (error: any) {
      alert(error?.message || 'Gagal menghapus foto.');
    }
  };

  const handleAddHomeHeroPhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    if (homeHeroSlides.length + files.length > 7) {
      alert('Carousel beranda dapat berisi maksimal 7 foto.');
      event.target.value = '';
      return;
    }
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
      alert('Gunakan foto JPG, PNG, atau WebP.');
      event.target.value = '';
      return;
    }
    if (files.reduce((total, file) => total + file.size, 0) > 8 * 1024 * 1024) {
      alert('Ukuran total foto baru maksimal 8 MB.');
      event.target.value = '';
      return;
    }
    try {
      const images = await Promise.all(files.map(fileToDataUrl));
      setHomeHeroSlides(current => [...current, ...images]);
      event.target.value = '';
    } catch (error: any) {
      alert(error?.message || 'Foto gagal dibaca. Silakan pilih ulang.');
    }
  };

  const handleSaveHomeHeroPhotos = async () => {
    if (homeHeroSlides.length < 1 || homeHeroSlides.length > 7) {
      alert('Carousel beranda harus berisi 1 sampai 7 foto.');
      return;
    }
    setIsSavingHomeHero(true);
    try {
      const savedSlides = await updateHomeHeroSlides(homeHeroSlides);
      setHomeHeroSlides(savedSlides);
      window.dispatchEvent(new Event('home-hero-updated'));
      alert('Foto carousel beranda berhasil disimpan.');
    } catch (error: any) {
      alert(error?.message || 'Gagal menyimpan foto carousel beranda.');
    } finally {
      setIsSavingHomeHero(false);
    }
  };

  const moveHomeHeroPhoto = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= homeHeroSlides.length) return;
    setHomeHeroSlides(current => {
      const reordered = [...current];
      [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
      return reordered;
    });
  };

  const removeHomeHeroPhoto = (index: number) => {
    if (homeHeroSlides.length <= 1) {
      alert('Carousel harus menyisakan minimal satu foto.');
      return;
    }
    setHomeHeroSlides(current => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleOpenEditGallery = (item: GalleryPhoto) => {
    setEditingGallery(item);
    setGalleryEditForm({
      title: item.title,
      category: item.category,
      description: item.description,
      photographer: item.photographer
    });
    setGalleryCoverFile(null);
    setGalleryAdditionalFiles([]);
  };

  const handleSaveGalleryEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGallery) return;
    if (galleryAdditionalFiles.length > 0 && (galleryAdditionalFiles.length < 3 || galleryAdditionalFiles.length > 5)) {
      alert('Pilih 3 sampai 5 foto baru, atau kosongkan jika hanya mengubah detail kegiatan.');
      return;
    }
    const selectedFiles = [...(galleryCoverFile ? [galleryCoverFile] : []), ...galleryAdditionalFiles];
    if (selectedFiles.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
      alert('Foto galeri harus berformat JPG, PNG, atau WebP.');
      return;
    }
    if (selectedFiles.reduce((total, file) => total + file.size, 0) > 8 * 1024 * 1024) {
      alert('Ukuran total foto baru maksimal 8 MB.');
      return;
    }

    setIsSavingGalleryEdit(true);
    try {
      const [image, additionalImages] = await Promise.all([
        galleryCoverFile ? fileToDataUrl(galleryCoverFile) : Promise.resolve(editingGallery.image),
        Promise.all(galleryAdditionalFiles.map(fileToDataUrl))
      ]);
      const updated = await updateGalleryPhoto({
        ...editingGallery,
        ...galleryEditForm,
        image,
        additionalImages: [...(editingGallery.additionalImages || []), ...additionalImages]
      });
      setGalleryItems(prev => prev.map(item => item.id === updated.id ? updated : item));
      setEditingGallery(null);
      setGalleryCoverFile(null);
      setGalleryAdditionalFiles([]);
      window.dispatchEvent(new Event('gallery-updated'));
      alert('Kegiatan galeri berhasil diperbarui.');
    } catch (error: any) {
      alert(error?.message || 'Gagal memperbarui kegiatan galeri.');
    } finally {
      setIsSavingGalleryEdit(false);
    }
  };

  // ---------------- YOUTUBE VIDEOS ----------------
  const extractYouTubeId = (url: string): string => {
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : '';
  };

  const filteredVideos = videos.filter(
    v =>
      v.title.toLowerCase().includes(searchVideo.toLowerCase()) ||
      v.category.toLowerCase().includes(searchVideo.toLowerCase()) ||
      v.description?.toLowerCase().includes(searchVideo.toLowerCase())
  );

  const handleOpenAddVideo = () => {
    setEditingVideo(null);
    setVideoForm({
      title: '',
      category: 'Kegiatan',
      youtubeUrl: '',
      description: '',
      date: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    });
    setIsVideoModalOpen(true);
  };

  const handleOpenEditVideo = (v: YouTubeVideo) => {
    setEditingVideo(v);
    setVideoForm({
      title: v.title,
      category: v.category,
      youtubeUrl: v.youtubeUrl,
      description: v.description || '',
      date: v.date || ''
    });
    setIsVideoModalOpen(true);
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    const vidId = extractYouTubeId(videoForm.youtubeUrl);
    if (!vidId) {
      alert('Tautan YouTube tidak valid. Gunakan format https://www.youtube.com/watch?v=... atau https://youtu.be/...');
      return;
    }
    try {
      if (editingVideo) {
        const payload: YouTubeVideo = {
          ...editingVideo,
          ...videoForm,
          videoId: vidId,
          thumbnailUrl: `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`
        };
        const updated = await updateVideo(payload);
        setVideos(prev => prev.map(v => (v.id === updated.id ? updated : v)));
      } else {
        const created = await createVideo(videoForm);
        setVideos(prev => [created, ...prev]);
      }
      setIsVideoModalOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan video YouTube.');
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus video ini dari galeri sekolah?')) return;
    try {
      await removeVideo(id);
      setVideos(prev => prev.filter(v => v.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus video.');
    }
  };

  // ---------------- KOMBEL ACTIVITIES & AGENDAS ----------------
  const handleOpenAddKombelActivity = () => {
    setEditingKombelActivity(null);
    setKombelActivityForm({
      title: '',
      date: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      image: '',
      description: '',
      speaker: 'Lukman Hi. Saleh, S.Pd',
      attendeesCount: 24
    });
    setKombelActivityImages([]);
    setIsKombelActivityModalOpen(true);
  };

  const handleOpenEditKombelActivity = (act: KombelActivity) => {
    setEditingKombelActivity(act);
    setKombelActivityForm({
      title: act.title,
      date: act.date,
      image: act.image || '',
      description: act.description,
      speaker: act.speaker || '',
      attendeesCount: act.attendeesCount || 20
    });
    setKombelActivityImages([act.image, ...(act.additionalImages || [])].filter(Boolean));
    setIsKombelActivityModalOpen(true);
  };

  const handleKombelActivityFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (kombelActivityImages.length + files.length > 5) {
      alert('Maksimal 5 foto. Hapus foto lama sebelum menambahkan foto pengganti.');
      e.target.value = '';
      return;
    }
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) ||
        files.reduce((total, file) => total + file.size, 0) > 8 * 1024 * 1024) {
      alert('Gunakan foto JPG, PNG, atau WebP dengan ukuran total maksimal 8 MB.');
      e.target.value = '';
      return;
    }
    try {
      const addedImages = await Promise.all(files.map(fileToDataUrl));
      setKombelActivityImages(current => [...current, ...addedImages]);
      e.target.value = '';
    } catch {
      alert('Foto kegiatan gagal dibaca. Silakan pilih ulang.');
      e.target.value = '';
    }
  };

  const handleSaveKombelActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kombelActivityForm.title || !kombelActivityForm.description) return;
    if ((!editingKombelActivity && (kombelActivityImages.length < 3 || kombelActivityImages.length > 5)) ||
        (editingKombelActivity && (kombelActivityImages.length < 1 || kombelActivityImages.length > 5))) {
      alert(editingKombelActivity
        ? 'Sisakan minimal 1 dan maksimal 5 foto dokumentasi.'
        : 'Pilih 3 sampai 5 foto untuk dokumentasi kegiatan baru.');
      return;
    }
    try {
      if (editingKombelActivity) {
        const payload: KombelActivity = {
          ...editingKombelActivity,
          ...kombelActivityForm,
          image: kombelActivityImages[0],
          additionalImages: kombelActivityImages.slice(1)
        };
        const updated = await updateKombelActivity(payload);
        setKombelActivities(prev => prev.map(a => (a.id === updated.id ? updated : a)));
      } else {
        const created = await createKombelActivity({
          ...kombelActivityForm,
          image: kombelActivityImages[0],
          additionalImages: kombelActivityImages.slice(1)
        });
        setKombelActivities(prev => [created, ...prev]);
      }
      setIsKombelActivityModalOpen(false);
      setKombelActivityImages([]);
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan kegiatan KOMBEL.');
    }
  };

  const handleDeleteKombelActivity = async (id: string) => {
    if (!confirm('Hapus dokumentasi kegiatan KOMBEL ini?')) return;
    try {
      await removeKombelActivity(id);
      setKombelActivities(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus kegiatan.');
    }
  };

  const handleOpenAddKombelAgenda = () => {
    setEditingKombelAgenda(null);
    setKombelAgendaForm({
      title: '',
      date: 'Sabtu Mendatang',
      time: '09:00 - 11:30 WIT',
      location: 'Ruang Guru SMAN 1 Halmahera Tengah',
      description: '',
      moderator: 'Lukman Hi. Saleh, S.Pd (Ketua KOMBEL)'
    });
    setIsKombelAgendaModalOpen(true);
  };

  const handleOpenEditKombelAgenda = (ag: KombelAgenda) => {
    setEditingKombelAgenda(ag);
    setKombelAgendaForm({
      title: ag.title,
      date: ag.date,
      time: ag.time,
      location: ag.location,
      description: ag.description,
      moderator: ag.moderator || ''
    });
    setIsKombelAgendaModalOpen(true);
  };

  const handleSaveKombelAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kombelAgendaForm.title || !kombelAgendaForm.description) return;
    try {
      if (editingKombelAgenda) {
        const payload: KombelAgenda = {
          ...editingKombelAgenda,
          ...kombelAgendaForm
        };
        const updated = await updateKombelAgenda(payload);
        setKombelAgendas(prev => prev.map(a => (a.id === updated.id ? updated : a)));
      } else {
        const created = await createKombelAgenda(kombelAgendaForm);
        setKombelAgendas(prev => [created, ...prev]);
      }
      setIsKombelAgendaModalOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan agenda KOMBEL.');
    }
  };

  const handleDeleteKombelAgenda = async (id: string) => {
    if (!confirm('Hapus agenda mingguan KOMBEL ini?')) return;
    try {
      await removeKombelAgenda(id);
      setKombelAgendas(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus agenda.');
    }
  };

  // ---------------- CONTACT MESSAGES ----------------
  const filteredMessages = messages.filter(
    m =>
      m.name.toLowerCase().includes(searchMessage.toLowerCase()) ||
      m.email.toLowerCase().includes(searchMessage.toLowerCase()) ||
      (m.subject && m.subject.toLowerCase().includes(searchMessage.toLowerCase())) ||
      m.message.toLowerCase().includes(searchMessage.toLowerCase())
  );

  const normalizedInternalSearch = internalSearch.trim().toLocaleLowerCase('id-ID');
  const filteredInternalAnnouncements = internalAnnouncements.filter(item =>
    [item.title, item.content, item.teacherName, item.targetClass || '']
      .some(value => value.toLocaleLowerCase('id-ID').includes(normalizedInternalSearch))
  );
  const filteredInternalAssignments = internalAssignments.filter(item =>
    [item.title, item.subject, item.teacherName, item.className, item.description]
      .some(value => value.toLocaleLowerCase('id-ID').includes(normalizedInternalSearch))
  );
  const filteredInternalSubmissions = internalSubmissions.filter(item => {
    const assignment = internalAssignments.find(task => task.id === item.assignmentId);
    return [item.studentName, item.studentNisn, item.classId, item.status, assignment?.title || '', assignment?.teacherName || '']
      .some(value => value.toLocaleLowerCase('id-ID').includes(normalizedInternalSearch));
  });

  const openNewInternalAnnouncement = () => {
    setEditingInternalAnnouncement(null);
    setInternalAnnouncementForm({ title: '', category: 'Umum', content: '', isImportant: false });
    setInternalActionError('');
    setIsInternalAnnouncementFormOpen(true);
  };

  const openEditInternalAnnouncement = (item: PortalAnnouncement) => {
    setEditingInternalAnnouncement(item);
    setInternalAnnouncementForm({
      title: item.title,
      category: item.category,
      content: item.content,
      isImportant: Boolean(item.isImportant)
    });
    setInternalActionError('');
    setIsInternalAnnouncementFormOpen(true);
  };

  const handleSaveInternalAnnouncement = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingInternalAnnouncement(true);
    setInternalActionError('');
    try {
      const saved = await savePortalAnnouncementApi({
        id: editingInternalAnnouncement?.id || '',
        ...internalAnnouncementForm,
        teacherId: editingInternalAnnouncement?.teacherId || '',
        teacherName: editingInternalAnnouncement?.teacherName || currentUser.fullName,
        createdAt: editingInternalAnnouncement?.createdAt || new Date().toISOString()
      });
      setInternalAnnouncements(previous => [
        saved,
        ...previous.filter(item => item.id !== saved.id)
      ]);
      setIsInternalAnnouncementFormOpen(false);
      setEditingInternalAnnouncement(null);
    } catch (error) {
      setInternalActionError(error instanceof Error ? error.message : 'Pengumuman internal gagal disimpan.');
    } finally {
      setIsSavingInternalAnnouncement(false);
    }
  };

  const handleDeleteInternalAnnouncement = async (item: PortalAnnouncement) => {
    if (!window.confirm(`Hapus pengumuman "${item.title}"?`)) return;
    setInternalActionError('');
    try {
      await removePortalAnnouncementApi(item.id);
      setInternalAnnouncements(previous => previous.filter(announcement => announcement.id !== item.id));
      if (editingInternalAnnouncement?.id === item.id) {
        setIsInternalAnnouncementFormOpen(false);
        setEditingInternalAnnouncement(null);
      }
    } catch (error) {
      setInternalActionError(error instanceof Error ? error.message : 'Pengumuman internal gagal dihapus.');
    }
  };

  const handleDownloadInternalSubmission = async (submission: AssignmentSubmission) => {
    setDownloadingSubmissionId(submission.id);
    try {
      await downloadSubmissionFile(submission.id, submission.fileName);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Berkas pengumpulan tidak dapat diunduh.');
    } finally {
      setDownloadingSubmissionId(null);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('Hapus pesan aspirasi masuk ini?')) return;
    try {
      await removeContactMessage(id);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus pesan.');
    }
  };

  const handleSendContactReply = async (message: ContactMessage) => {
    const replyMessage = (replyDrafts[message.id] || '').trim();
    if (!replyMessage) {
      alert('Isi balasan wajib diisi.');
      return;
    }

    setSendingReplyId(message.id);
    try {
      const updated = await replyToContactMessage(message.id, replyMessage);
      setMessages(prev => prev.map(item => item.id === updated.id ? updated : item));
      setReplyDrafts(prev => ({ ...prev, [message.id]: '' }));
      setReplyingMessageId(null);
      alert(`Balasan berhasil dikirim ke ${message.email}.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengirim balasan email.');
    } finally {
      setSendingReplyId(null);
    }
  };

  const handleSaveContactInfo = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingContactInfo(true);
    try {
      const savedContactInfo = await apiUpdateContactInfo(contactInfo);
      setContactInfo(savedContactInfo);
      window.dispatchEvent(new Event(CONTACT_INFO_UPDATED_EVENT));
      alert('Informasi kontak berhasil diperbarui.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Gagal menyimpan informasi kontak.');
    } finally {
      setIsSavingContactInfo(false);
    }
  };

  // ---------------- USERS & PASSWORD RESET ----------------
  const filteredUsers = users.filter(u => {
    const matchesRole = filterUserRole === 'Semua' || u.role === filterUserRole;
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.username.toLowerCase().includes(searchUser.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchUser.toLowerCase()));
    return matchesRole && matchesSearch;
  });
  const selectableUsers = filteredUsers.filter(user => user.id !== currentUser.id);

  const hasStudentAccount = (student: Student) => users.some(
    user => user.role === 'siswa' && (user.linkedId === student.id || user.username === student.nisn)
  );
  const hasTeacherAccount = (teacher: Teacher) => users.some(
    user => ['guru', 'kepala_sekolah', 'ketua_kombel'].includes(user.role) &&
      (user.linkedId === teacher.id || user.username === teacher.nip)
  );
  const studentAccountCount = students.filter(hasStudentAccount).length;
  const teacherAccountCount = teachers.filter(hasTeacherAccount).length;
  const missingLinkedAccounts =
    students.filter(student => !hasStudentAccount(student)).length +
    teachers.filter(teacher => !hasTeacherAccount(teacher)).length;
  const countsMatch = studentAccountCount === students.length && teacherAccountCount === teachers.length;

  const handleProvisionMissingAccounts = async () => {
    setIsProvisioningAccounts(true);
    try {
      const result = await provisionLinkedAccounts();
      setUsers(await fetchUsers());
      loadAllServerData();
      if (result.created.length) {
        const credentials = result.created.map(account =>
          `${account.role.toUpperCase()} — ${account.fullName}\nUsername: ${account.username}\nSandi sementara: ${account.temporaryPassword}`
        ).join('\n\n');
        window.alert(`Akun untuk data lama berhasil dibuat. Simpan dan berikan sandi sementara secara pribadi; sandi hanya ditampilkan sekali.\n\n${credentials}`);
      } else {
        window.alert('Tidak ada akun siswa/guru yang tertinggal untuk dibuat.');
      }
      if (result.conflicts.length) {
        window.alert(`Ada ${result.conflicts.length} data yang memakai NISN/NIP atau tautan akun yang berbenturan. Periksa akun berikut secara manual di Kelola Akun & Sandi:\n\n${result.conflicts.map(item => `${item.role.toUpperCase()} — ${item.fullName} (${item.username})`).join('\n')}`);
      }
    } catch (error: any) {
      alert(error?.message || 'Gagal menyelaraskan akun siswa dan guru.');
    } finally {
      setIsProvisioningAccounts(false);
    }
  };

  const handleResetSchoolData = async () => {
    if (isResettingSchoolData) return;
    const accepted = window.confirm(
      'Reset seluruh data sekolah di PostgreSQL? Data siswa, guru, akun non-admin, PPDB, pesan, pengumuman, galeri, KOMBEL, tugas, pengumpulan, pengaturan kontak, dan berkas unggahan akan dihapus. Akun admin tetap tersedia dan tindakan ini tidak dapat dibatalkan.'
    );
    if (!accepted) return;
    const confirmation = window.prompt('Ketik HAPUS SEMUA DATA SEKOLAH untuk melanjutkan:');
    if (confirmation !== 'HAPUS SEMUA DATA SEKOLAH') {
      if (confirmation !== null) window.alert('Teks konfirmasi tidak cocok. Tidak ada data yang dihapus.');
      return;
    }

    setIsResettingSchoolData(true);
    try {
      const result = await apiResetSchoolData(confirmation);
      window.alert(`${result.message}\nAkun non-admin dihapus: ${result.removedUsers}\nBerkas unggahan dihapus: ${result.removedFiles}`);
      window.location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Reset data sekolah gagal.');
    } finally {
      setIsResettingSchoolData(false);
    }
  };

  const handleOpenResetModal = (u: UserAccount) => {
    setSelectedUserForReset(u);
    // Generate a temporary password with the browser cryptographic RNG.
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const randomValues = crypto.getRandomValues(new Uint32Array(12));
    let rand = 'Sman1-';
    for (const value of randomValues) rand += chars.charAt(value % chars.length);
    setTempPasswordInput(rand);
    setResetSuccessMessage('');
    setCopiedKey(false);
    setIsResetModalOpen(true);
  };

  const handleOpenUserForm = (user?: UserAccount) => {
    setEditingUserAccount(user || null);
    setUserAccountForm(user
      ? { username: user.username, fullName: user.fullName, email: user.email || '', role: user.role }
      : { username: '', fullName: '', email: '', role: 'siswa' });
    setIsUserFormOpen(true);
  };

  const handleSaveUserAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingUserAccount(true);
    try {
      if (editingUserAccount) {
        const result = await updateManagedUser(editingUserAccount.id, userAccountForm);
        setUsers(await fetchUsers());
        setIsUserFormOpen(false);
        window.alert(result.message);
      } else {
        const result = await createManagedUser(userAccountForm);
        setUsers(await fetchUsers());
        setIsUserFormOpen(false);
        window.alert(`${result.message}\n\nUsername: ${result.user.username}\nSandi sementara: ${result.temporaryPassword}\n\nSimpan sandi ini dan berikan secara pribadi. Sandi hanya ditampilkan sekali.`);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Gagal menyimpan akun.');
    } finally {
      setIsSavingUserAccount(false);
    }
  };

  const handleBulkDeleteUserAccounts = async () => {
    if (!selectedAccountIds.size || isDeletingAccounts) return;
    if (!window.confirm(`Hapus ${selectedAccountIds.size} akun terpilih? Akun akan masuk ke Tempat Sampah dan dapat dipulihkan.`)) return;
    setIsDeletingAccounts(true);
    try {
      const result = await bulkDeleteManagedUsers([...selectedAccountIds]);
      setUsers(await fetchUsers());
      setSelectedAccountIds(new Set());
      setIsBulkAccountDeleteMode(false);
      window.alert(result.message);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Gagal menghapus akun terpilih.');
    } finally {
      setIsDeletingAccounts(false);
    }
  };

  const isBulkMode = (collection: BulkDeleteCollection) => bulkDeleteCollection === collection;

  const toggleBulkDeleteMode = (collection: BulkDeleteCollection) => {
    setSelectedBulkIds(new Set());
    setBulkDeleteCollection(current => current === collection ? null : collection);
  };

  const toggleBulkItem = (id: string) => {
    setSelectedBulkIds(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDeleteItems = async (collection: BulkDeleteCollection, label: string) => {
    if (bulkDeleteCollection !== collection || !selectedBulkIds.size || isBulkDeleting) return;
    const ids = [...selectedBulkIds];
    if (!window.confirm(`Hapus ${ids.length} ${label} terpilih? Data akan dipindahkan ke Tempat Sampah dan dapat dipulihkan.`)) return;
    setIsBulkDeleting(true);
    try {
      const result = await bulkDeleteAdminItems(collection, ids);
      setSelectedBulkIds(new Set());
      setBulkDeleteCollection(null);
      if (collection === 'ppdb' && selectedApplicant && ids.includes(selectedApplicant.id)) {
        setSelectedApplicant(null);
        setCommitteeNotesDraft('');
      }
      if (collection === 'announcements') window.dispatchEvent(new Event('storage-announcements-updated'));
      if (collection === 'gallery') window.dispatchEvent(new Event('gallery-updated'));
      await loadAllServerData();
      window.alert(result.message);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : `Gagal menghapus ${label} terpilih.`);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const bulkDeleteToolbar = (
    collection: BulkDeleteCollection,
    visibleIds: string[],
    label: string
  ) => {
    const active = isBulkMode(collection);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedBulkIds.has(id));
    return (
      <div className="flex min-w-0 max-w-full flex-nowrap items-center justify-start gap-2 overflow-x-auto pb-1 sm:justify-end">
        <button
          type="button"
          onClick={() => toggleBulkDeleteMode(collection)}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${active ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'bg-rose-700 text-white hover:bg-rose-800'}`}
        >
          <Trash2 className="h-4 w-4" />
          {active ? 'Batal pilih' : 'Pilih untuk hapus'}
        </button>
        {active && (
          <>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                aria-label={`Pilih semua ${label} yang ditampilkan`}
                checked={allVisibleSelected}
                disabled={!visibleIds.length}
                onChange={event => setSelectedBulkIds(previous => {
                  const next = new Set(previous);
                  visibleIds.forEach(id => event.target.checked ? next.add(id) : next.delete(id));
                  return next;
                })}
              />
              Pilih semua tampil
            </label>
            <button
              type="button"
              onClick={() => handleBulkDeleteItems(collection, label)}
              disabled={!selectedBulkIds.size || isBulkDeleting}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {isBulkDeleting ? 'Menghapus...' : `Hapus Terpilih (${selectedBulkIds.size})`}
            </button>
          </>
        )}
      </div>
    );
  };

  const handleExecuteAdminReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset || !tempPasswordInput) return;
    try {
      const res = await apiAdminResetPassword(selectedUserForReset.id, tempPasswordInput);
      setResetSuccessMessage(
        res.message || `Kata sandi untuk ${selectedUserForReset.fullName} berhasil diubah.`
      );
      // Refresh user list to show mustChangePassword flag
      loadAllServerData();
    } catch (err: any) {
      alert(err?.message || 'Gagal mereset kata sandi.');
    }
  };

  const handleCopyTempPassword = () => {
    navigator.clipboard.writeText(tempPasswordInput);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6 px-3 py-6 sm:space-y-8 sm:px-8 sm:py-8 lg:py-12">
      <input
        ref={rosterFileInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={handleRosterFileChange}
      />
      {/* Admin Header */}
      <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-white shadow-xl sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-blue-800 text-blue-200 uppercase font-semibold">
                Administrator Sistem & Tata Usaha
              </span>
              {isSyncing ? (
                <span className="text-[10px] text-amber-300 font-mono flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  Menyinkronkan...
                </span>
              ) : (
                lastSyncTime && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    Sinkron: {lastSyncTime}
                  </span>
                )
              )}
            </div>
            <h1 className="break-words font-serif-title text-xl font-bold text-white sm:text-3xl">
              Pusat Manajemen Data SMAN 1 Halmahera Tengah
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Panel administrasi terpadu: pengelolaan peserta didik, direktori pendidik, verifikasi berkas PPDB,
              publikasi warta, galeri foto & video, agenda KOMBEL, dan tata kelola akun pengguna.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:gap-3">
            <button
              onClick={loadAllServerData}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 shadow-sm transition-colors hover:bg-slate-700 md:flex-none"
              title="Sinkronkan ulang data dari server"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Muat Ulang</span>
            </button>
            <button
              onClick={handleResetSchoolData}
              disabled={isResettingSchoolData}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-800/60 bg-rose-950/60 px-3.5 py-2 text-xs font-medium text-rose-200 shadow-sm transition-colors hover:bg-rose-900/80 md:flex-none"
              title="Hapus data sekolah di PostgreSQL; akun admin tetap tersedia"
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${isResettingSchoolData ? 'animate-pulse' : ''}`} />
              <span>{isResettingSchoolData ? 'Mereset...' : 'Reset Data Sekolah'}</span>
            </button>
          </div>
        </div>

        {/* Top Statistics Counters */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-8 pt-6 border-t border-slate-800">
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Total Siswa</span>
            <span className="font-mono text-2xl font-bold text-white tabular-nums">
              {students.length} <span className="text-xs font-normal text-slate-400">Jiwa</span>
            </span>
          </div>
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Direktori Guru</span>
            <span className="font-mono text-2xl font-bold text-emerald-400 tabular-nums">
              {teachers.length} <span className="text-xs font-normal text-slate-400">Guru</span>
            </span>
          </div>
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Pendaftar PPDB</span>
            <span className="font-mono text-2xl font-bold text-amber-400 tabular-nums">
              {applicants.length} <span className="text-xs font-normal text-slate-400">Calon</span>
            </span>
          </div>
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Warta / Pengumuman</span>
            <span className="font-mono text-2xl font-bold text-blue-400 tabular-nums">
              {announcements.length} <span className="text-xs font-normal text-slate-400">Pos</span>
            </span>
          </div>
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Galeri & Video</span>
            <span className="font-mono text-2xl font-bold text-purple-400 tabular-nums">
              {galleryItems.length + videos.length} <span className="text-xs font-normal text-slate-400">Item</span>
            </span>
          </div>
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Akun Terdaftar</span>
            <span className="font-mono text-2xl font-bold text-teal-400 tabular-nums">
              {users.length} <span className="text-xs font-normal text-slate-400">User</span>
            </span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setActiveTab('siswa')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'siswa'
                ? 'bg-blue-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Siswa ({students.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('guru')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'guru'
                ? 'bg-blue-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Guru & Staf ({teachers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ppdb')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ppdb'
                ? 'bg-blue-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Verifikasi PPDB ({applicants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pengumuman')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pengumuman'
                ? 'bg-blue-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Pengumuman ({announcements.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('galeri')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'galeri'
                ? 'bg-blue-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Images className="w-3.5 h-3.5" />
            <span>Galeri Foto ({galleryItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('video')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'video'
                ? 'bg-blue-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video YouTube ({videos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('kombel')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'kombel'
                ? 'bg-blue-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>KOMBEL ({kombelActivities.length + kombelAgendas.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('internal')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'internal'
                ? 'bg-blue-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Info Internal ({internalAnnouncements.length + internalAssignments.length + internalSubmissions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pesan')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pesan'
                ? 'bg-blue-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Aspirasi ({messages.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('kontak')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'kontak'
                ? 'bg-blue-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Contact className="w-3.5 h-3.5" />
            <span>Info Kontak</span>
          </button>

          <button
            onClick={() => setActiveTab('pengguna')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pengguna'
                ? 'bg-blue-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Kelola Akun & Sandi ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sampah')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sampah'
                ? 'bg-rose-800 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Tempat Sampah</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: MANAJEMEN SISWA
         ========================================================================= */}
      {activeTab === 'siswa' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-full max-w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari siswa atau NISN..."
                  value={searchStudent}
                  onChange={e => setSearchStudent(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                />
              </div>

              <select
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 focus:ring-2 focus:ring-blue-900 focus:outline-none"
              >
                <option value="Semua">Semua Kelas</option>
                {SCHOOL_CLASSES.map(classId => <option key={classId} value={classId}>{classId}</option>)}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {bulkDeleteToolbar('students', filteredStudents.map(item => item.id), 'siswa')}
              <button
                type="button"
                onClick={handleDownloadRosterTemplate}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" /> Template Excel
              </button>
              <button
                type="button"
                onClick={() => rosterFileInputRef.current?.click()}
                disabled={isImportingRoster}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" /> {isImportingRoster ? 'Memproses Excel...' : 'Impor Excel'}
              </button>
              <button
                onClick={handleOpenAddStudent}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Siswa Baru</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                    {isBulkMode('students') && <th className="w-10 px-3 py-3 text-center"></th>}
                    <th className="py-3 px-3 w-10 text-center">No</th>
                    <th className="py-3 px-4">Nama Lengkap Siswa</th>
                    <th className="py-3 px-3">NISN / NIS</th>
                    <th className="py-3 px-3">Kelas</th>
                    <th className="py-3 px-3">Jenis Kelamin</th>
                    <th className="py-3 px-3">Wali Kelas</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-sans">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={isBulkMode('students') ? 8 : 7} className="py-8 text-center text-slate-400">
                        Tidak ada siswa yang sesuai kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((std, idx) => (
                      <tr key={std.id} className="hover:bg-slate-50/70 transition-colors">
                        {isBulkMode('students') && <td className="px-3 py-3 text-center"><input type="checkbox" aria-label={`Pilih siswa ${std.fullName}`} checked={selectedBulkIds.has(std.id)} onChange={() => toggleBulkItem(std.id)} /></td>}
                        <td className="py-3 px-3 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {std.fullName}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {std.nisn} / {std.nis}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          <span className="font-semibold">{std.className}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{std.gender}</td>
                        <td className="py-3 px-3 text-slate-700">{std.homeroomTeacher}</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditStudent(std)}
                            className="p-1.5 text-blue-900 hover:bg-blue-50 rounded transition-colors"
                            title="Edit Data Siswa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(std.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Hapus Siswa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: GURU & TENAGA KEPENDIDIKAN
         ========================================================================= */}
      {activeTab === 'guru' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-full max-w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama, NIP, atau mata pelajaran..."
                  value={searchTeacher}
                  onChange={e => setSearchTeacher(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                />
              </div>

              <select
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 focus:ring-2 focus:ring-blue-900 focus:outline-none"
              >
                <option value="Semua">Semua Rumpun/Departemen</option>
                <option value="MIPA">MIPA</option>
                <option value="IPS">IPS</option>
                <option value="Bahasa">Bahasa</option>
                <option value="Informatika">Informatika</option>
                <option value="Seni & Olahraga">Seni & Olahraga</option>
                <option value="BK">Bimbingan Konseling (BK)</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {bulkDeleteToolbar('teachers', filteredTeachers.map(item => item.id), 'guru/staf')}
              <button
                type="button"
                onClick={handleDownloadRosterTemplate}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" /> Template Excel
              </button>
              <button
                type="button"
                onClick={() => rosterFileInputRef.current?.click()}
                disabled={isImportingRoster}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" /> {isImportingRoster ? 'Memproses Excel...' : 'Impor Excel'}
              </button>
              <button
                onClick={handleOpenAddTeacher}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Guru / Staf Baru</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                    {isBulkMode('teachers') && <th className="w-10 px-3 py-3 text-center"></th>}
                    <th className="py-3 px-3 w-10 text-center">No</th>
                    <th className="py-3 px-4">Nama Lengkap & Gelar</th>
                    <th className="py-3 px-3">NIP</th>
                    <th className="py-3 px-3">Mata Pelajaran</th>
                    <th className="py-3 px-3">Rumpun</th>
                    <th className="py-3 px-3">Pendidikan Terakhir</th>
                    <th className="py-3 px-3">Kontak</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-sans">
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={isBulkMode('teachers') ? 9 : 8} className="py-8 text-center text-slate-400">
                        Tidak ada guru ditemukan dengan kriteria tersebut.
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((tch, idx) => (
                      <tr key={tch.id} className="hover:bg-slate-50/70 transition-colors">
                        {isBulkMode('teachers') && <td className="px-3 py-3 text-center"><input type="checkbox" aria-label={`Pilih guru atau staf ${tch.fullName}`} checked={selectedBulkIds.has(tch.id)} onChange={() => toggleBulkItem(tch.id)} /></td>}
                        <td className="py-3 px-3 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {tch.photoUrl ? (
                              <img
                                src={tch.photoUrl}
                                alt={tch.fullName}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-xs">
                                {tch.fullName.charAt(0)}
                              </div>
                            )}
                            <div>
                              <span className="font-semibold text-slate-900 block">{tch.fullName}</span>
                              <span className="text-[10px] text-slate-500 font-medium">{tch.degree}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">{tch.nip.replace(/\s+/g, '')}</td>
                        <td className="py-3 px-3 font-medium text-slate-800">{tch.subject}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                            {tch.department}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 text-[11px] max-w-[180px] truncate">
                          {tch.education}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                          <div>{tch.email}</div>
                          <div>{tch.phone}</div>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditTeacher(tch)}
                            className="p-1.5 text-blue-900 hover:bg-blue-50 rounded transition-colors"
                            title="Edit Data Guru"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTeacher(tch.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Hapus Data Guru"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: VERIFIKASI PPDB
         ========================================================================= */}
      {activeTab === 'ppdb' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="relative w-full max-w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari pendaftar, nomor reg, atau NISN..."
                value={searchPPDB}
                onChange={e => setSearchPPDB(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <span className="text-xs text-slate-500">Total {filteredApplicants.length} pendaftar PPDB daring terdata</span>
              {bulkDeleteToolbar('ppdb', filteredApplicants.map(item => item.id), 'pendaftar PPDB')}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                      {isBulkMode('ppdb') && <th className="w-10 px-3 py-3 text-center"></th>}
                      <th className="py-3 px-3">No. Reg</th>
                      <th className="py-3 px-3">Nama Calon Siswa</th>
                      <th className="py-3 px-3">Jalur Pilihan</th>
                      <th className="py-3 px-2 text-center">Nilai</th>
                      <th className="py-3 px-3">Status Terkini</th>
                      <th className="py-3 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-sans">
                    {filteredApplicants.length === 0 ? (
                      <tr>
                        <td colSpan={isBulkMode('ppdb') ? 7 : 6} className="py-8 text-center text-slate-400">
                          Tidak ada pendaftar ditemukan.
                        </td>
                      </tr>
                    ) : (
                      filteredApplicants.map(app => (
                        <tr
                          key={app.id}
                          onClick={() => {
                            setSelectedApplicant(app);
                            setCommitteeNotesDraft(app.committeeNotes || '');
                            setPpdbActionError('');
                          }}
                          className={`cursor-pointer transition-colors ${
                            selectedApplicant?.id === app.id
                              ? 'bg-blue-50/80 font-medium'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          {isBulkMode('ppdb') && <td className="px-3 py-3 text-center" onClick={event => event.stopPropagation()}><input type="checkbox" aria-label={`Pilih pendaftar ${app.fullName}`} checked={selectedBulkIds.has(app.id)} onChange={() => toggleBulkItem(app.id)} /></td>}
                          <td className="py-3 px-3 font-mono font-bold text-blue-900">
                            {app.registrationNumber}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            {app.fullName}
                            <span className="block text-[10px] text-slate-400 font-mono">
                              NISN: {app.nisn}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-amber-700 font-medium">{app.track}</td>
                          <td className="py-3 px-2 text-center font-mono font-bold text-slate-800">
                            {app.averageReportScore}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                app.status === 'Lulus Seleksi'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : app.status === 'Berkas Terverifikasi'
                                  ? 'bg-blue-100 text-blue-800'
                                  : app.status === 'Cadangan'
                                  ? 'bg-amber-100 text-amber-800'
                                  : app.status === 'Tidak Diterima'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {app.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right text-blue-900 text-xs font-semibold">
                            Tinjau &rarr;
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detail & Status Action Sidebar */}
            <div className="lg:col-span-4">
              {selectedApplicant ? (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-200 pb-3 flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        Panel Verifikasi Berkas PPDB
                      </span>
                      <h3 className="font-bold text-slate-900 text-base">{selectedApplicant.fullName}</h3>
                      <p className="text-xs text-blue-900 font-mono font-bold">
                        {selectedApplicant.registrationNumber}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeletePPDB(selectedApplicant.id)}
                      className="text-rose-600 hover:text-rose-800 p-1"
                      title="Hapus pendaftar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Asal Sekolah:</span>
                      <span className="font-medium text-slate-800">{selectedApplicant.previousSchool}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Kontak WhatsApp:</span>
                      <span className="font-mono text-slate-800">{selectedApplicant.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Alamat Domisili:</span>
                      <span className="text-slate-600">{selectedApplicant.address}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-200">
                    {ppdbActionError && (
                      <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        {ppdbActionError}
                      </p>
                    )}
                    <label className="text-xs font-bold text-slate-800 block">
                      Perbarui Status Kelulusan:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isUpdatingPPDB}
                        onClick={() => handleUpdatePPDBStatus(selectedApplicant, 'Lulus Seleksi')}
                        className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-xs font-semibold transition-colors"
                      >
                        Lulus Seleksi
                      </button>
                      <button
                        type="button"
                        disabled={isUpdatingPPDB}
                        onClick={() => handleUpdatePPDBStatus(selectedApplicant, 'Berkas Terverifikasi')}
                        className="py-1.5 px-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs font-semibold transition-colors"
                      >
                        Terverifikasi
                      </button>
                      <button
                        type="button"
                        disabled={isUpdatingPPDB}
                        onClick={() => handleUpdatePPDBStatus(selectedApplicant, 'Cadangan')}
                        className="py-1.5 px-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded text-xs font-semibold transition-colors"
                      >
                        Cadangan
                      </button>
                      <button
                        type="button"
                        disabled={isUpdatingPPDB}
                        onClick={() => handleUpdatePPDBStatus(selectedApplicant, 'Tidak Diterima')}
                        className="py-1.5 px-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded text-xs font-semibold transition-colors"
                      >
                        Tidak Diterima
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2">
                    <label className="text-xs font-bold text-slate-800 block">
                      Catatan Tim Verifikasi (Dilihat Siswa):
                    </label>
                    <textarea
                      rows={3}
                      value={committeeNotesDraft}
                      disabled={isUpdatingPPDB}
                      onChange={e => setCommitteeNotesDraft(e.target.value)}
                      className="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-900 focus:outline-none"
                      placeholder="Masukkan catatan alasan seleksi atau kekurangan berkas..."
                    />
                    <button
                      type="button"
                      disabled={isUpdatingPPDB || committeeNotesDraft === (selectedApplicant.committeeNotes || '')}
                      onClick={() => handleUpdatePPDBStatus(selectedApplicant, selectedApplicant.status, committeeNotesDraft)}
                      className="w-full rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUpdatingPPDB ? 'Menyimpan...' : 'Simpan Catatan Verifikasi'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                  Pilih salah satu calon peserta didik baru di tabel sebelah kiri untuk meninjau berkas dan memperbarui status penerimaan.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: KELOLA PENGUMUMAN
         ========================================================================= */}
      {activeTab === 'pengumuman' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="relative w-full max-w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari pengumuman atau kategori..."
                value={searchAnnouncement}
                onChange={e => setSearchAnnouncement(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {bulkDeleteToolbar('announcements', filteredAnnouncements.map(item => item.id), 'pengumuman')}
              <button
                onClick={handleOpenAddAnnouncement}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tambah Pengumuman Baru</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                    {isBulkMode('announcements') && <th className="w-10 px-3 py-3 text-center"></th>}
                    <th className="py-3 px-3 w-10 text-center">No</th>
                    <th className="py-3 px-4 min-w-[240px]">Judul Pengumuman</th>
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3">Tanggal Terbit</th>
                    <th className="py-3 px-3">Penulis / Unit</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-sans">
                  {filteredAnnouncements.length === 0 ? (
                    <tr>
                      <td colSpan={isBulkMode('announcements') ? 7 : 6} className="py-8 text-center text-slate-500">
                        Tidak ada pengumuman ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredAnnouncements.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        {isBulkMode('announcements') && <td className="px-3 py-3 text-center"><input type="checkbox" aria-label={`Pilih pengumuman ${item.title}`} checked={selectedBulkIds.has(item.id)} onChange={() => toggleBulkItem(item.id)} /></td>}
                        <td className="py-3 px-3 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 leading-snug">{item.title}</div>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.summary}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.category === 'Prestasi'
                                ? 'bg-blue-100 text-blue-800'
                                : item.category === 'PPDB'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.category === 'Akademik'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {item.date}
                        </td>
                        <td className="py-3 px-3 text-slate-700">{item.author}</td>
                        <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditAnnouncement(item)}
                            className="p-1.5 text-blue-900 hover:bg-blue-50 rounded transition-colors"
                            title="Edit Pengumuman"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAnnouncement(item.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Hapus Pengumuman"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: ARSIP GALERI FOTO
         ========================================================================= */}
      {activeTab === 'galeri' && (
        <div className="space-y-6">
          <section className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-serif-title text-lg font-bold text-slate-900">Carousel Foto Beranda</h2>
                <p className="mt-1 text-xs text-slate-600">Pilih 1–7 foto. Urutan di sini menentukan urutan tayang; pengunjung dapat menggeser foto ke samping.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-50">
                <ImagePlus className="h-4 w-4" /> Tambah Foto
                <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleAddHomeHeroPhotos} className="sr-only" />
              </label>
            </div>
            {homeHeroSlides.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {homeHeroSlides.map((image, index) => (
                  <div key={`${image}-${index}`} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <img src={image} alt={`Slide beranda ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
                    <div className="flex items-center justify-between p-2">
                      <span className="text-[11px] font-semibold text-slate-600">Foto {index + 1}</span>
                      <div className="flex items-center gap-0.5">
                        <button type="button" onClick={() => moveHomeHeroPhoto(index, -1)} disabled={index === 0} aria-label="Geser foto ke urutan sebelumnya" className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => moveHomeHeroPhoto(index, 1)} disabled={index === homeHeroSlides.length - 1} aria-label="Geser foto ke urutan berikutnya" className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronRight className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => removeHomeHeroPhoto(index)} disabled={homeHeroSlides.length === 1} aria-label="Hapus foto" className="rounded p-1 text-rose-600 hover:bg-rose-50 disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-center text-xs text-slate-500">Belum ada carousel tersimpan. Tambahkan minimal satu foto.</p>
            )}
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">{homeHeroSlides.length}/7 foto</span>
              <button type="button" onClick={handleSaveHomeHeroPhotos} disabled={isSavingHomeHero || homeHeroSlides.length < 1} className="rounded-lg bg-blue-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
                {isSavingHomeHero ? 'Menyimpan...' : 'Simpan Carousel'}
              </button>
            </div>
          </section>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center">
                <ImagePlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif-title text-xl font-bold text-slate-900">
                  Tambah Foto ke Arsip Galeri Sekolah
                </h2>
                <p className="text-xs text-slate-500">
                  Unggah dokumentasi resmi kegiatan belajar mengajar, ekstrakurikuler, dan prestasi sekolah.
                </p>
              </div>
            </div>
            <form onSubmit={handleUploadGallery} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Judul / Nama Kegiatan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    value={galleryForm.title}
                    onChange={e => setGalleryForm({ ...galleryForm, title: e.target.value })}
                    placeholder="Contoh: Turnamen Futsal Antar Kelas"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Kategori <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={galleryForm.category}
                    onChange={e =>
                      setGalleryForm({ ...galleryForm, category: e.target.value as GalleryPhoto['category'] })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option>Akademik</option>
                    <option>Prestasi</option>
                    <option>Ekstrakurikuler</option>
                    <option>Olahraga</option>
                    <option>Sosialisasi</option>
                    <option>Upacara</option>
                  </select>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Fotografer / Dokumentasi</label>
                  <input
                    value={galleryForm.photographer}
                    onChange={e => setGalleryForm({ ...galleryForm, photographer: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Pilih 3–5 Foto Kegiatan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="gallery-files-input"
                    required
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                    onChange={e => setGalleryFiles(Array.from(e.target.files || []))}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                  />
                  <p className="text-[11px] text-slate-500">Satu kegiatan disimpan sebagai satu album. Maksimal 8 MB total.</p>
                </div>
              </div>
              <textarea
                rows={3}
                value={galleryForm.description}
                onChange={e => setGalleryForm({ ...galleryForm, description: e.target.value })}
                placeholder="Deskripsi singkat kegiatan..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
              <button
                disabled={isUploadingGallery}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-2"
              >
                <ImagePlus className="w-4 h-4" />{' '}
                {isUploadingGallery
                  ? 'Mengunggah ke server...'
                  : `Upload ${galleryFiles.length ? galleryFiles.length + ' Foto' : 'Foto'}`}
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-900">Foto yang Sudah Diarsipkan ({galleryItems.length})</h3>
                {bulkDeleteToolbar('gallery', galleryItems.map(item => item.id), 'album galeri')}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5">
              {galleryItems.map(item => (
                <div key={item.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white group">
                  <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/60 text-white">
                      {item.category}
                    </span>
                    {isBulkMode('gallery') && <input type="checkbox" aria-label={`Pilih album ${item.title}`} checked={selectedBulkIds.has(item.id)} onChange={() => toggleBulkItem(item.id)} className="absolute right-2 top-2 h-4 w-4 rounded border-white shadow" />}
                  </div>
                  <div className="p-3 space-y-1">
                    <h4 className="text-xs font-semibold text-slate-800 line-clamp-2">{item.title}</h4>
                    <p className="text-[10px] text-slate-400 font-mono">{item.date}</p>
                    <p className="text-[10px] text-slate-500">{1 + (item.additionalImages?.length || 0)} foto</p>
                    <div className="mt-2 flex items-center justify-between">
                      <button
                        onClick={() => handleOpenEditGallery(item)}
                        className="text-[10px] font-semibold text-blue-800 hover:underline flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit kegiatan</span>
                      </button>
                      <button
                        onClick={() => handleDeleteGallery(item.id)}
                        className="text-[10px] font-semibold text-rose-600 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {editingGallery && (
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
              onClick={() => setEditingGallery(null)}
            >
              <div
                className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
                onClick={e => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="font-serif-title text-lg font-bold text-slate-900">Edit Kegiatan Galeri</h3>
                    <p className="text-xs text-slate-500">{1 + (editingGallery.additionalImages?.length || 0)} foto tersimpan</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingGallery(null)}
                    aria-label="Tutup edit galeri"
                    className="rounded p-1 text-slate-500 hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
                  {[editingGallery.image, ...(editingGallery.additionalImages || [])].map((image, index) => (
                    <img
                      key={`${editingGallery.id}-${index}`}
                      src={image}
                      alt={`Foto ${index + 1} kegiatan ${editingGallery.title}`}
                      className="h-16 w-24 shrink-0 rounded border border-slate-200 object-cover"
                    />
                  ))}
                </div>

                <form onSubmit={handleSaveGalleryEdit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Nama Kegiatan</label>
                      <input
                        required
                        value={galleryEditForm.title}
                        onChange={e => setGalleryEditForm({ ...galleryEditForm, title: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Kategori</label>
                      <select
                        value={galleryEditForm.category}
                        onChange={e => setGalleryEditForm({ ...galleryEditForm, category: e.target.value as GalleryPhoto['category'] })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      >
                        <option>Akademik</option>
                        <option>Prestasi</option>
                        <option>Ekstrakurikuler</option>
                        <option>Olahraga</option>
                        <option>Sosialisasi</option>
                        <option>Upacara</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Fotografer / Dokumentasi</label>
                    <input
                      value={galleryEditForm.photographer}
                      onChange={e => setGalleryEditForm({ ...galleryEditForm, photographer: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Deskripsi</label>
                    <textarea
                      rows={3}
                      value={galleryEditForm.description}
                      onChange={e => setGalleryEditForm({ ...galleryEditForm, description: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Ganti Foto Utama (opsional)</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={e => setGalleryCoverFile(e.target.files?.[0] || null)}
                        className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">Tambah 3–5 Foto (opsional)</label>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        onChange={e => setGalleryAdditionalFiles(Array.from(e.target.files || []))}
                        className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                      />
                      <p className="text-[11px] text-slate-500">Pilih 3–5 foto baru. Total ukuran foto baru maksimal 8 MB.</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingGallery(null)}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingGalleryEdit}
                      className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      {isSavingGalleryEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 6: GALERI VIDEO YOUTUBE
         ========================================================================= */}
      {activeTab === 'video' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="relative w-full max-w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari video kegiatan atau kategori..."
                value={searchVideo}
                onChange={e => setSearchVideo(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {bulkDeleteToolbar('videos', filteredVideos.map(item => item.id), 'video')}
              <button
                onClick={handleOpenAddVideo}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tambah Video YouTube Baru</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredVideos.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                Belum ada video YouTube yang ditambahkan. Klik tombol "Tambah Video YouTube Baru" di atas.
              </div>
            ) : (
              filteredVideos.map(v => (
                <div key={v.id} className="relative bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
                  {isBulkMode('videos') && <input type="checkbox" aria-label={`Pilih video ${v.title}`} checked={selectedBulkIds.has(v.id)} onChange={() => toggleBulkItem(v.id)} className="absolute right-2 top-2 z-10 h-4 w-4 rounded border-white shadow" />}
                  <div>
                    <div className="relative aspect-video bg-slate-900 overflow-hidden group">
                      <img
                        src={v.thumbnailUrl || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`}
                        alt={v.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                          <Play className="w-6 h-6 ml-1 fill-white" />
                        </div>
                      </div>
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-black/70 text-white">
                        {v.category}
                      </span>
                    </div>

                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">
                        {v.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {v.description || 'Dokumentasi video resmi SMA Negeri 1 Halmahera Tengah.'}
                      </p>
                      <div className="text-[11px] font-mono text-slate-400">
                        {v.date} · ID: {v.videoId}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between mt-2">
                    <a
                      href={v.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-900 hover:underline flex items-center gap-1"
                    >
                      <span>Buka di YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditVideo(v)}
                        className="p-1.5 text-blue-900 hover:bg-blue-50 rounded"
                        title="Edit video"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteVideo(v.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                        title="Hapus video"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB: INFORMASI INTERNAL GURU & SISWA
         ========================================================================= */}
      {activeTab === 'internal' && (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Informasi Internal Guru & Murid</h2>
              <p className="mt-1 text-xs text-slate-500">Lihat pengumuman guru, tugas kelas, dan jawaban yang dikumpulkan siswa.</p>
            </div>
            <button
              type="button"
              onClick={loadAllServerData}
              disabled={isSyncing}
              className="self-start rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:self-auto"
            >
              {isSyncing ? 'Memuat...' : 'Muat ulang data'}
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
              {([
                ['pengumuman', `Pengumuman (${internalAnnouncements.length})`],
                ['tugas', `Tugas (${internalAssignments.length})`],
                ['pengumpulan', `Pengumpulan (${internalSubmissions.length})`]
              ] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setInternalSubTab(tab)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${internalSubTab === tab ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              {internalSubTab === 'pengumuman' && bulkDeleteToolbar('portalAnnouncements', filteredInternalAnnouncements.map(item => item.id), 'pengumuman internal')}
              {internalSubTab === 'tugas' && bulkDeleteToolbar('assignments', filteredInternalAssignments.map(item => item.id), 'tugas')}
              {internalSubTab === 'pengumpulan' && bulkDeleteToolbar('submissions', filteredInternalSubmissions.map(item => item.id), 'pengumpulan')}
              {internalSubTab === 'pengumuman' && (
                <button
                  type="button"
                  onClick={openNewInternalAnnouncement}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  <PlusCircle className="h-4 w-4" />
                  Buat pengumuman
                </button>
              )}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={internalSearch}
                  onChange={event => setInternalSearch(event.target.value)}
                  placeholder="Cari kelas, guru, siswa, atau isi..."
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>
            </div>
          </div>

          {internalLoadError && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{internalLoadError}</div>
          )}
          {internalActionError && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{internalActionError}</div>
          )}

          {internalSubTab === 'pengumuman' && (
            <div className="space-y-4">
              {isInternalAnnouncementFormOpen && (
                <form onSubmit={handleSaveInternalAnnouncement} className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                  <div>
                    <h3 className="font-bold text-slate-900">{editingInternalAnnouncement ? 'Ubah pengumuman internal' : 'Buat pengumuman internal'}</h3>
                    <p className="mt-1 text-xs text-slate-600">Pengumuman ini akan tampil kepada murid sesuai kategori kelas yang dipilih.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-xs font-semibold text-slate-700">
                      Judul
                      <input
                        required
                        maxLength={150}
                        value={internalAnnouncementForm.title}
                        onChange={event => setInternalAnnouncementForm(previous => ({ ...previous, title: event.target.value }))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
                        placeholder="Judul informasi"
                      />
                    </label>
                    <label className="space-y-1 text-xs font-semibold text-slate-700">
                      Sasaran
                      <select
                        value={internalAnnouncementForm.category}
                        onChange={event => setInternalAnnouncementForm(previous => ({
                          ...previous,
                          category: event.target.value as PortalAnnouncement['category']
                        }))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
                      >
                        <option>Umum</option>
                        <option>Kelas X</option>
                        <option>Kelas XI</option>
                        <option>Kelas XII</option>
                      </select>
                    </label>
                  </div>
                  <label className="block space-y-1 text-xs font-semibold text-slate-700">
                    Isi informasi
                    <textarea
                      required
                      rows={4}
                      maxLength={10000}
                      value={internalAnnouncementForm.content}
                      onChange={event => setInternalAnnouncementForm(previous => ({ ...previous, content: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
                      placeholder="Tulis informasi untuk guru dan murid..."
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={internalAnnouncementForm.isImportant}
                      onChange={event => setInternalAnnouncementForm(previous => ({ ...previous, isImportant: event.target.checked }))}
                      className="rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                    />
                    Tandai sebagai informasi penting
                  </label>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsInternalAnnouncementFormOpen(false);
                        setEditingInternalAnnouncement(null);
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingInternalAnnouncement}
                      className="rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      {isSavingInternalAnnouncement ? 'Menyimpan...' : 'Simpan pengumuman'}
                    </button>
                  </div>
                </form>
              )}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filteredInternalAnnouncements.length ? filteredInternalAnnouncements.map(item => (
                  <article key={item.id} className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    {isBulkMode('portalAnnouncements') && <input type="checkbox" aria-label={`Pilih pengumuman internal ${item.title}`} checked={selectedBulkIds.has(item.id)} onChange={() => toggleBulkItem(item.id)} className="absolute right-3 top-3 h-4 w-4" />}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-900">{item.targetClass || item.category}</span>
                      <div className="flex items-center gap-2">
                        {item.isImportant && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">Penting</span>}
                        <button
                          type="button"
                          onClick={() => openEditInternalAnnouncement(item)}
                          className="rounded p-1.5 text-blue-900 hover:bg-blue-50"
                          title="Ubah pengumuman"
                          aria-label={`Ubah pengumuman ${item.title}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteInternalAnnouncement(item)}
                          className="rounded p-1.5 text-rose-600 hover:bg-rose-50"
                          title="Hapus pengumuman"
                          aria-label={`Hapus pengumuman ${item.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="mt-3 font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{item.content}</p>
                    <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">Oleh {item.teacherName} · {new Date(item.createdAt).toLocaleString('id-ID')}</p>
                  </article>
                )) : <p className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Belum ada pengumuman internal yang sesuai.</p>}
              </div>
            </div>
          )}

          {internalSubTab === 'tugas' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredInternalAssignments.length ? filteredInternalAssignments.map(item => (
              <article key={item.id} className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                {isBulkMode('assignments') && <input type="checkbox" aria-label={`Pilih tugas ${item.title}`} checked={selectedBulkIds.has(item.id)} onChange={() => toggleBulkItem(item.id)} className="absolute right-3 top-3 h-4 w-4" />}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">{item.className || item.classId}</span>
                    <span className="text-slate-500">Batas: {new Date(item.deadline).toLocaleString('id-ID')}</span>
                  </div>
                  <h3 className="mt-3 font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-blue-900">{item.subject} · {item.teacherName}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{item.description || 'Tidak ada keterangan tambahan.'}</p>
                  <p className="mt-3 text-xs text-slate-500">Nilai maksimal: {item.maxScore}{item.attachmentName ? ` · Lampiran: ${item.attachmentName}` : ''}</p>
                </article>
              )) : <p className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Belum ada tugas yang sesuai.</p>}
            </div>
          )}

          {internalSubTab === 'pengumpulan' && (
            <div className="space-y-3">
              {filteredInternalSubmissions.length ? filteredInternalSubmissions.map(item => {
                const assignment = internalAssignments.find(task => task.id === item.assignmentId);
                const isFile = item.submissionType === 'file' && item.linkOrContent.startsWith('/uploads/');
                return (
                  <article key={item.id} className="relative flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between">
                    {isBulkMode('submissions') && <input type="checkbox" aria-label={`Pilih pengumpulan ${item.studentName}`} checked={selectedBulkIds.has(item.id)} onChange={() => toggleBulkItem(item.id)} className="absolute right-3 top-3 h-4 w-4" />}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900">{item.studentName}</h3>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{item.classId}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.status === 'Dinilai' ? 'bg-emerald-50 text-emerald-700' : item.status === 'Terlambat' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{item.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{assignment?.title || 'Tugas telah dihapus'} · {assignment?.teacherName || 'Guru tidak tersedia'}</p>
                      <p className="mt-1 text-xs text-slate-500">NISN: {item.studentNisn} · Dikumpulkan: {item.submittedAt}</p>
                      {isFile ? (
                        <p className="mt-2 text-sm text-slate-700">Berkas: {item.fileName || 'Lampiran siswa'}</p>
                      ) : (
                        <p className="mt-2 break-words whitespace-pre-wrap text-sm text-slate-700">{item.linkOrContent}</p>
                      )}
                      {item.status === 'Dinilai' && <p className="mt-2 text-sm font-semibold text-emerald-800">Nilai: {item.score} · Umpan balik: {item.feedback || 'Tidak ada'}</p>}
                    </div>
                    {isFile && (
                      <button
                        type="button"
                        onClick={() => handleDownloadInternalSubmission(item)}
                        disabled={downloadingSubmissionId === item.id}
                        className="shrink-0 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-50 disabled:opacity-50"
                      >
                        {downloadingSubmissionId === item.id ? 'Mengunduh...' : 'Unduh berkas'}
                      </button>
                    )}
                  </article>
                );
              }) : <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Belum ada pengumpulan tugas yang sesuai.</p>}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          TAB 7: KEGIATAN & AGENDA KOMBEL
         ========================================================================= */}
      {activeTab === 'kombel' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-blue-950">Jadwal rutin, tempat, dan tujuan KOMBEL</h2>
              <p className="mt-1 text-xs text-blue-800">Kelola informasi yang tampil pada halaman Komunitas Belajar.</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.('kombel')}
              className="shrink-0 rounded-lg bg-blue-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
            >
              Ubah Informasi KOMBEL
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setKombelSubTab('kegiatan')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  kombelSubTab === 'kegiatan'
                    ? 'bg-blue-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Dokumentasi Kegiatan ({kombelActivities.length})
              </button>
              <button
                onClick={() => setKombelSubTab('agenda')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  kombelSubTab === 'agenda'
                    ? 'bg-blue-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Agenda Mingguan ({kombelAgendas.length})
              </button>
            </div>

            {kombelSubTab === 'kegiatan' ? (
              <button
                onClick={handleOpenAddKombelActivity}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tambah Dokumentasi Kegiatan</span>
              </button>
            ) : (
              <button
                onClick={handleOpenAddKombelAgenda}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tambah Agenda KOMBEL</span>
              </button>
            )}
          </div>

          <div className="flex justify-end">
            {kombelSubTab === 'kegiatan'
              ? bulkDeleteToolbar('kombelActivities', kombelActivities.map(item => item.id), 'kegiatan KOMBEL')
              : bulkDeleteToolbar('kombelAgendas', kombelAgendas.map(item => item.id), 'agenda KOMBEL')}
          </div>

          {kombelSubTab === 'kegiatan' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {kombelActivities.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                  Belum ada dokumentasi kegiatan KOMBEL.
                </div>
              ) : (
                kombelActivities.map(act => (
                  <div key={act.id} className="relative bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
                    {isBulkMode('kombelActivities') && <input type="checkbox" aria-label={`Pilih kegiatan ${act.title}`} checked={selectedBulkIds.has(act.id)} onChange={() => toggleBulkItem(act.id)} className="absolute right-3 top-3 z-10 h-4 w-4 rounded border-white shadow" />}
                    <div>
                      {act.image && (
                        <div className="relative aspect-[16/9] bg-slate-100 overflow-hidden">
                          <img src={act.image} alt={act.title} className="w-full h-full object-cover" />
                          {(act.additionalImages?.length || 0) > 0 && (
                            <span className="absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
                              {1 + (act.additionalImages?.length || 0)} foto
                            </span>
                          )}
                        </div>
                      )}
                      <div className="p-4 space-y-2">
                        <div className="text-[11px] font-mono text-blue-900 font-semibold">{act.date}</div>
                        <h3 className="font-bold text-slate-900 text-sm leading-snug">{act.title}</h3>
                        <p className="text-xs text-slate-600 line-clamp-3">{act.description}</p>
                        {act.speaker && (
                          <div className="text-[11px] text-slate-500">
                            <strong>Narasumber:</strong> {act.speaker}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between mt-3">
                      <span className="text-[11px] font-mono text-slate-400">
                        {act.attendeesCount || 20} Guru Hadir
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditKombelActivity(act)}
                          className="p-1.5 text-blue-900 hover:bg-blue-50 rounded"
                          title="Edit kegiatan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteKombelActivity(act.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                          title="Hapus kegiatan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {kombelAgendas.length === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                  Belum ada agenda mingguan KOMBEL yang dijadwalkan.
                </div>
              ) : (
                kombelAgendas.map(ag => (
                  <div key={ag.id} className="relative bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {isBulkMode('kombelAgendas') && <input type="checkbox" aria-label={`Pilih agenda ${ag.title}`} checked={selectedBulkIds.has(ag.id)} onChange={() => toggleBulkItem(ag.id)} className="absolute right-3 top-3 h-4 w-4" />}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900">
                          {ag.date}
                        </span>
                        <span className="text-xs font-mono text-slate-500">{ag.time}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">{ag.title}</h3>
                      <p className="text-xs text-slate-600 max-w-2xl">{ag.description}</p>
                      <div className="text-[11px] text-slate-400 font-medium">
                        Lokasi: {ag.location} {ag.moderator ? `· Moderator: ${ag.moderator}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleOpenEditKombelAgenda(ag)}
                        className="p-2 text-blue-900 hover:bg-blue-50 rounded-lg border border-slate-200 text-xs font-medium flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteKombelAgenda(ag.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 text-xs font-medium flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 8: PESAN ASPIRASI HUMAS
         ========================================================================= */}
      {activeTab === 'pesan' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="relative w-full max-w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari pengirim, email, atau isi pesan..."
                value={searchMessage}
                onChange={e => setSearchMessage(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <span className="text-xs text-slate-500">{filteredMessages.length} pesan masuk dari masyarakat & wali murid</span>
              {bulkDeleteToolbar('messages', filteredMessages.map(item => item.id), 'pesan')}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            {filteredMessages.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                Tidak ada pesan masuk yang sesuai.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredMessages.map(msg => (
                  <div key={msg.id} className="py-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isBulkMode('messages') && <input type="checkbox" aria-label={`Pilih pesan dari ${msg.name}`} checked={selectedBulkIds.has(msg.id)} onChange={() => toggleBulkItem(msg.id)} />}
                        <span className="font-bold text-slate-900">{msg.name}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 font-mono">{msg.email}</span>
                        {msg.phone && (
                          <>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500 font-mono">{msg.phone}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-mono text-[11px]">{msg.createdAt}</span>
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="text-rose-600 hover:text-rose-800 p-1"
                          title="Hapus pesan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-semibold text-blue-900 text-xs sm:text-sm">{msg.subject}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {msg.message}
                    </p>
                    {msg.replyMessage && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs">
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-emerald-900">Balasan terkirim melalui email</span>
                          <span className="text-[11px] text-emerald-800">{msg.repliedAt} · {msg.repliedBy}</span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed text-slate-700">{msg.replyMessage}</p>
                      </div>
                    )}
                    {replyingMessageId === msg.id ? (
                      <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/60 p-3">
                        <label htmlFor={`reply-${msg.id}`} className="block text-xs font-semibold text-slate-800">
                          Balasan untuk {msg.email}
                        </label>
                        <textarea
                          id={`reply-${msg.id}`}
                          rows={4}
                          value={replyDrafts[msg.id] || ''}
                          onChange={event => setReplyDrafts(prev => ({ ...prev, [msg.id]: event.target.value }))}
                          placeholder="Tulis balasan yang akan dikirim ke email pengirim..."
                          className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-800"
                          disabled={sendingReplyId === msg.id}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setReplyingMessageId(null)}
                            disabled={sendingReplyId === msg.id}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendContactReply(msg)}
                            disabled={sendingReplyId === msg.id || !(replyDrafts[msg.id] || '').trim()}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Send className="h-3.5 w-3.5" />
                            {sendingReplyId === msg.id ? 'Mengirim...' : 'Kirim ke Email'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingMessageId(msg.id);
                          setReplyDrafts(prev => ({ ...prev, [msg.id]: '' }));
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900 transition-colors hover:bg-blue-100"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Balas melalui Email
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'kontak' && (
        <form onSubmit={handleSaveContactInfo} className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="font-bold text-lg text-slate-900">Informasi Kontak Website</h2>
            <p className="mt-1 text-xs text-slate-500">
              Perubahan akan ditampilkan pada halaman Kontak, footer, dan tautan media sosial website.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
            {contactInfoFields.map(field => (
              <div key={field.key} className={`space-y-1 ${field.multiline ? 'sm:col-span-2' : ''}`}>
                <label htmlFor={`contact-info-${field.key}`} className="text-xs font-semibold text-slate-700">
                  {field.label}
                </label>
                {field.multiline ? (
                  <textarea
                    id={`contact-info-${field.key}`}
                    required
                    maxLength={500}
                    rows={3}
                    value={contactInfo[field.key]}
                    onChange={event => setContactInfo(prev => ({ ...prev, [field.key]: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                ) : (
                  <input
                    id={`contact-info-${field.key}`}
                    required
                    type={field.type || 'text'}
                    maxLength={500}
                    value={contactInfo[field.key]}
                    onChange={event => setContactInfo(prev => ({ ...prev, [field.key]: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingContactInfo}
              className="rounded-lg bg-blue-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
            >
              {isSavingContactInfo ? 'Menyimpan...' : 'Simpan Informasi Kontak'}
            </button>
          </div>
        </form>
      )}

      {/* =========================================================================
          TAB 9: MANAJEMEN AKUN PENGGUNA & RESET SANDI
         ========================================================================= */}
      {activeTab === 'pengguna' && (
        <div className="space-y-6">
          <div className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${countsMatch ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className="text-xs">
              <p className={`font-bold ${countsMatch ? 'text-emerald-900' : 'text-amber-900'}`}>
                Siswa: {studentAccountCount}/{students.length} akun · Guru: {teacherAccountCount}/{teachers.length} akun
              </p>
              <p className={`mt-1 ${countsMatch ? 'text-emerald-800' : 'text-amber-800'}`}>
                {countsMatch
                  ? 'Jumlah akun portal siswa dan guru sesuai dengan data siswa dan guru.'
                  : missingLinkedAccounts
                    ? `Ada ${missingLinkedAccounts} data siswa/guru yang belum memiliki akun portal.`
                    : 'Jumlah akun dan data belum sama; periksa kemungkinan akun ganda atau akun yang tidak tertaut.'}
              </p>
            </div>
            {missingLinkedAccounts > 0 && (
              <button
                type="button"
                onClick={handleProvisionMissingAccounts}
                disabled={isProvisioningAccounts}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" />
                {isProvisioningAccounts ? 'Membuat akun...' : `Buat ${missingLinkedAccounts} akun yang tertinggal`}
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-full max-w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau username / NISN / NIP..."
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                />
              </div>

              <select
                value={filterUserRole}
                onChange={e => setFilterUserRole(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 focus:ring-2 focus:ring-blue-900 focus:outline-none"
              >
                <option value="Semua">Semua Peran (Role)</option>
                <option value="admin">Admin Tata Usaha</option>
                <option value="kepala_sekolah">Kepala Sekolah</option>
                <option value="ketua_kombel">Ketua KOMBEL</option>
                <option value="guru">Dewan Guru</option>
                <option value="siswa">Peserta Didik</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">Total {filteredUsers.length} akun terdaftar di sistem basis data</span>
              <div className="flex flex-wrap justify-end gap-2">
                <button onClick={() => handleOpenUserForm()} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800">
                  <UserPlus className="h-4 w-4" /> Tambah Akun
                </button>
                <button
                  onClick={() => {
                    setIsBulkAccountDeleteMode(mode => !mode);
                    setSelectedAccountIds(new Set());
                  }}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${isBulkAccountDeleteMode ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'bg-rose-700 text-white hover:bg-rose-800'}`}
                >
                  <Trash2 className="h-4 w-4" /> {isBulkAccountDeleteMode ? 'Batal Pilih' : 'Hapus Akun'}
                </button>
                {isBulkAccountDeleteMode && (
                  <button onClick={handleBulkDeleteUserAccounts} disabled={!selectedAccountIds.size || isDeletingAccounts} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50">
                    <Trash2 className="h-4 w-4" /> {isDeletingAccounts ? 'Menghapus...' : `Hapus Terpilih (${selectedAccountIds.size})`}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                    {isBulkAccountDeleteMode && <th className="w-10 px-3 py-3 text-center"><input type="checkbox" aria-label="Pilih semua akun yang dapat dihapus" checked={selectableUsers.length > 0 && selectableUsers.every(user => selectedAccountIds.has(user.id))} onChange={event => setSelectedAccountIds(event.target.checked ? new Set(selectableUsers.map(user => user.id)) : new Set())} /></th>}
                    <th className="py-3 px-3 w-10 text-center">No</th>
                    <th className="py-3 px-4">Nama Lengkap Akun</th>
                    <th className="py-3 px-3">Username (NIP/NISN)</th>
                    <th className="py-3 px-3">Peran Akses (RBAC)</th>
                    <th className="py-3 px-3">Email Terdaftar</th>
                    <th className="py-3 px-3 text-center">Status Keamanan Sandi</th>
                    <th className="py-3 px-4 text-right">Kelola Akun</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-sans">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={isBulkAccountDeleteMode ? 8 : 7} className="py-8 text-center text-slate-400">
                        Tidak ada akun pengguna yang sesuai kriteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, idx) => (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        {isBulkAccountDeleteMode && <td className="px-3 py-3 text-center"><input type="checkbox" aria-label={`Pilih akun ${u.username}`} disabled={u.id === currentUser.id} checked={selectedAccountIds.has(u.id)} onChange={event => setSelectedAccountIds(previous => {
                          const next = new Set(previous);
                          if (event.target.checked) next.add(u.id); else next.delete(u.id);
                          return next;
                        })} /></td>}
                        <td className="py-3 px-3 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {u.fullName}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700 font-semibold">
                          {u.username}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-900'
                                : u.role === 'kepala_sekolah'
                                ? 'bg-amber-100 text-amber-900'
                                : u.role === 'ketua_kombel'
                                ? 'bg-emerald-100 text-emerald-900'
                                : u.role === 'guru'
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-slate-100 text-slate-900'
                            }`}
                          >
                            {u.role.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                          {u.email || '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {u.mustChangePassword ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Wajib Ganti Sandi</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Normal</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <button onClick={() => handleOpenUserForm(u)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                              <Edit2 className="h-3 w-3" /> Edit
                            </button>
                            <button onClick={() => handleOpenResetModal(u)} className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-100">
                              <Key className="h-3 w-3" /> Reset Sandi
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS
         ========================================================================= */}

      {activeTab === 'sampah' && (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Tempat Sampah</h2>
              <p className="mt-1 text-sm text-slate-600">Item yang dihapus disimpan di PostgreSQL. Pulihkan item untuk mengembalikannya atau hapus permanen jika sudah tidak diperlukan.</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => {
                  setTrashBulkAction(current => current === 'restore' ? null : 'restore');
                  setSelectedTrashIds(new Set());
                }}
                disabled={!trashItems.length || isLoadingTrash || isTrashActionInProgress}
                className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${trashBulkAction === 'restore' ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'bg-emerald-700 text-white hover:bg-emerald-800'}`}
              >
                <RotateCcw className="h-4 w-4" /> {trashBulkAction === 'restore' ? 'Batal pilih' : 'Pilih untuk pulihkan'}
              </button>
              <button
                onClick={() => {
                  setTrashBulkAction(current => current === 'delete' ? null : 'delete');
                  setSelectedTrashIds(new Set());
                }}
                disabled={!trashItems.length || isLoadingTrash || isTrashActionInProgress}
                className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${trashBulkAction === 'delete' ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'bg-rose-700 text-white hover:bg-rose-800'}`}
              >
                <Trash2 className="h-4 w-4" /> {trashBulkAction === 'delete' ? 'Batal pilih' : 'Pilih untuk hapus'}
              </button>
              {trashBulkAction && (
                <>
                  <label className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      aria-label="Pilih semua item Tempat Sampah yang ditampilkan"
                      checked={allTrashSelected}
                      disabled={!visibleTrashIds.length || isTrashActionInProgress}
                      onChange={event => setSelectedTrashIds(event.target.checked ? new Set(visibleTrashIds) : new Set())}
                    />
                    Pilih semua tampil
                  </label>
                  <button
                    onClick={trashBulkAction === 'restore' ? handleRestoreSelectedTrashItems : handlePermanentlyDeleteSelectedTrashItems}
                    disabled={!selectedTrashIds.size || isTrashActionInProgress}
                    className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${trashBulkAction === 'restore' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-700 hover:bg-rose-800'}`}
                  >
                    {trashBulkAction === 'restore' ? <RotateCcw className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                    {trashBulkAction === 'restore' ? 'Pulihkan Terpilih' : 'Hapus Terpilih'} ({selectedTrashIds.size})
                  </button>
                </>
              )}
              <button onClick={loadTrash} disabled={isLoadingTrash || isTrashActionInProgress} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                <RotateCcw className={`h-4 w-4 ${isLoadingTrash ? 'animate-spin' : ''}`} /> Muat Ulang
              </button>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {isLoadingTrash ? (
              <p className="p-8 text-center text-sm text-slate-500">Memuat tempat sampah...</p>
            ) : trashItems.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">Tempat sampah kosong.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                    <tr>
                      {trashBulkAction && <th className="w-10 px-4 py-3"></th>}
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Jenis</th>
                      <th className="px-4 py-3">Dihapus</th>
                      <th className="px-4 py-3 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trashItems.map(item => (
                      <tr key={item.id}>
                        {trashBulkAction && (
                          <td className="w-10 px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              aria-label={`Pilih ${item.label}`}
                              checked={selectedTrashIds.has(item.id)}
                              disabled={isTrashActionInProgress}
                              onChange={() => setSelectedTrashIds(current => {
                                const next = new Set(current);
                                if (next.has(item.id)) next.delete(item.id);
                                else next.add(item.id);
                                return next;
                              })}
                            />
                          </td>
                        )}
                        <td className="px-4 py-3"><div className="font-semibold text-slate-900">{item.label}</div><div className="text-xs text-slate-500">{item.summary}</div></td>
                        <td className="px-4 py-3 text-xs text-slate-600">{item.type === 'uploaded_files' ? 'Berkas' : item.type}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{new Date(item.deletedAt).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3"><div className="flex justify-end gap-2">
                          {!trashBulkAction && <button onClick={() => handleRestoreTrashItem(item)} disabled={isTrashActionInProgress} className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">Pulihkan</button>}
                          {!trashBulkAction && <button onClick={() => handlePermanentlyDeleteTrashItem(item)} disabled={isTrashActionInProgress} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">Hapus permanen</button>}
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Modal: Add / Edit Student */}
      {isStudentModalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-serif-title text-lg font-bold text-slate-900">
                {editingStudent ? 'Edit Data Peserta Didik' : 'Tambah Peserta Didik Baru'}
              </h3>
              <button onClick={() => setIsStudentModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  required
                  value={studentForm.fullName}
                  onChange={e => setStudentForm({ ...studentForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Email Pemulihan Siswa</label>
                <input
                  type="email"
                  required
                  placeholder="Email aktif siswa atau orang tua/wali"
                  value={studentForm.email}
                  onChange={e => setStudentForm({ ...studentForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500">Tautan reset kata sandi akan dikirim ke alamat ini.</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">NISN (10 Digit)</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={studentForm.nisn}
                    onChange={e => setStudentForm({ ...studentForm, nisn: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">NIS Sekolah</label>
                  <input
                    type="text"
                    required
                    value={studentForm.nis}
                    onChange={e => setStudentForm({ ...studentForm, nis: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Jenis Kelamin</label>
                  <select
                    value={studentForm.gender}
                    onChange={e => setStudentForm({ ...studentForm, gender: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none bg-white"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Kelas</label>
                  <select
                    value={studentForm.classId}
                    onChange={e => setStudentForm({
                      ...studentForm,
                      classId: e.target.value,
                      className: e.target.value
                    })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none bg-white"
                  >
                    {SCHOOL_CLASSES.map(classId => <option key={classId} value={classId}>{classId}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Wali Kelas</label>
                <input
                  type="text"
                  value={studentForm.homeroomTeacher}
                  onChange={e => setStudentForm({ ...studentForm, homeroomTeacher: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Simpan Data Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Teacher */}
      {isTeacherModalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-serif-title text-lg font-bold text-slate-900">
                {editingTeacher ? 'Edit Data Guru & Pendidik' : 'Tambah Tenaga Pendidik Baru'}
              </h3>
              <button onClick={() => setIsTeacherModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Nama Lengkap & Gelar Akademik <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Lukman Hi. Saleh, S.Pd"
                  value={teacherForm.fullName}
                  onChange={e => setTeacherForm({ ...teacherForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    NIP (18 Digit) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 197804122002121003"
                    value={teacherForm.nip}
                    onChange={e => setTeacherForm({ ...teacherForm, nip: e.target.value.replace(/\s+/g, '') })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Gelar Singkat</label>
                  <input
                    type="text"
                    placeholder="Contoh: S.Pd / M.Pd"
                    value={teacherForm.degree}
                    onChange={e => setTeacherForm({ ...teacherForm, degree: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Mata Pelajaran Utama <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kimia & Praktikum Sains"
                    value={teacherForm.subject}
                    onChange={e => setTeacherForm({ ...teacherForm, subject: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Rumpun Departemen</label>
                  <select
                    value={teacherForm.department}
                    onChange={e => setTeacherForm({ ...teacherForm, department: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="MIPA">MIPA</option>
                    <option value="IPS">IPS</option>
                    <option value="Bahasa">Bahasa</option>
                    <option value="Informatika">Informatika</option>
                    <option value="Seni & Olahraga">Seni & Olahraga</option>
                    <option value="BK">Bimbingan Konseling (BK)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Kelas Wali (Wali Kelas)</label>
                <select
                  value={teacherForm.homeroomClass}
                  onChange={e => setTeacherForm({ ...teacherForm, homeroomClass: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Tidak menjadi wali kelas</option>
                  {homeroomClassOptions.map(classId => {
                    const assignedTeacher = teachers.find(
                      teacher => teacher.id !== editingTeacher?.id && teacher.homeroomClass === classId
                    );
                    return (
                      <option key={classId} value={classId} disabled={!!assignedTeacher}>
                        {classId}{assignedTeacher ? ` — ${assignedTeacher.fullName}` : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-500">Penugasan ini hanya dapat diubah oleh admin.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Riwayat Pendidikan</label>
                <input
                  type="text"
                  placeholder="Contoh: S1 Pendidikan Kimia, Universitas Khairun (Unkhair) Ternate"
                  value={teacherForm.education}
                  onChange={e => setTeacherForm({ ...teacherForm, education: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Email Sekolah</label>
                  <input
                    type="email"
                    required
                    placeholder="nama@sman1halteng.sch.id"
                    value={teacherForm.email}
                    onChange={e => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">No. Kontak / WA</label>
                  <input
                    type="text"
                    placeholder="+62 812-xxxx-xxxx"
                    value={teacherForm.phone}
                    onChange={e => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Foto Profil Guru (JPG / PNG)</label>
                {teacherForm.photoUrl && (
                  <img
                    src={teacherForm.photoUrl}
                    alt={`Pratinjau foto ${teacherForm.fullName || 'guru'}`}
                    className="h-24 w-20 rounded-lg border border-slate-200 object-cover"
                  />
                )}
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={handleTeacherPhotoChange}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                />
                <p className="text-[11px] text-slate-500">Pilih file JPG atau PNG, maksimal 5 MB. Kosongkan jika foto tidak ingin diganti.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Biografi Singkat</label>
                <textarea
                  rows={2}
                  value={teacherForm.bio}
                  onChange={e => setTeacherForm({ ...teacherForm, bio: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTeacherModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Simpan Data Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Announcement */}
      {isAnnouncementModalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-900" />
                <h3 className="font-serif-title text-lg font-bold text-slate-900">
                  {editingAnnouncement ? 'Edit Pengumuman Sekolah' : 'Buat Pengumuman Baru'}
                </h3>
              </div>
              <button onClick={() => setIsAnnouncementModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Judul Pengumuman <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Jadwal Pelaksanaan Asesmen Sumatif 2026"
                  value={announcementForm.title}
                  onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="announcement-date" className="text-xs font-semibold text-slate-700">
                  Tanggal Pengumuman <span className="text-rose-500">*</span>
                </label>
                <input
                  id="announcement-date"
                  type="date"
                  required
                  value={announcementForm.date}
                  onChange={e => setAnnouncementForm({ ...announcementForm, date: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Kategori <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={announcementForm.category}
                    onChange={e => setAnnouncementForm({ ...announcementForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="Akademik">Akademik</option>
                    <option value="Prestasi">Prestasi</option>
                    <option value="PPDB">PPDB</option>
                    <option value="Kegiatan">Kegiatan</option>
                    <option value="Umum">Umum</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Penulis / Unit Penerbit</label>
                  <input
                    type="text"
                    required
                    value={announcementForm.author}
                    onChange={e => setAnnouncementForm({ ...announcementForm, author: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Ringkasan Singkat (Muncul di Beranda) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ringkasan 1-2 kalimat untuk pratinjau kartu..."
                  value={announcementForm.summary}
                  onChange={e => setAnnouncementForm({ ...announcementForm, summary: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Isi Pengumuman Lengkap <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Tuliskan isi pengumuman lengkap secara rinci..."
                  value={announcementForm.content}
                  onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              {currentUser.role === 'admin' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Foto Pengumuman (3–5 foto)</label>
                <p className="text-[11px] text-slate-500">Foto bersifat opsional. Jika mengunggah, pilih 3–5 foto sekaligus. JPG, PNG, atau WEBP; maksimal 5 MB per foto. Foto disimpan tanpa mengubah ukuran aslinya.</p>
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                  onChange={async e => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    if (files.length < 3 || files.length > 5) {
                      alert('Pilih minimal 3 dan maksimal 5 foto.');
                      e.target.value = '';
                      return;
                    }
                    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
                    if (files.some(file => !allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024)) {
                      alert('Pastikan semua foto berformat JPG, PNG, atau WEBP dengan ukuran maksimal 5 MB per foto.');
                      e.target.value = '';
                      return;
                    }
                    try {
                      const images = await Promise.all(files.map(fileToDataUrl));
                      setAnnouncementForm(prev => ({ ...prev, images }));
                    } catch (error) {
                      alert(error instanceof Error ? error.message : 'Foto gagal dibaca. Silakan pilih kembali.');
                      e.target.value = '';
                    }
                  }}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                />
                {announcementForm.images.length > 0 && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {announcementForm.images.map((image, index) => (
                        <img key={`${image}-${index}`} src={image} alt={`Pratinjau foto ${index + 1}`} className="w-full h-24 rounded-lg border border-slate-200 object-cover" />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAnnouncementForm(prev => ({ ...prev, images: [] }))}
                      className="px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px]"
                    >
                      Hapus semua foto
                    </button>
                  </div>
                )}
              </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAnnouncementModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  {editingAnnouncement ? 'Perbarui Pengumuman' : 'Publikasikan Pengumuman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit YouTube Video */}
      {isVideoModalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-red-600" />
                <h3 className="font-serif-title text-lg font-bold text-slate-900">
                  {editingVideo ? 'Edit Video YouTube' : 'Tambah Video YouTube ke Galeri'}
                </h3>
              </div>
              <button onClick={() => setIsVideoModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVideo} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Judul Video <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Profil Laboratorium Sains Bahari SMAN 1 Halmahera Tengah"
                  value={videoForm.title}
                  onChange={e => setVideoForm({ ...videoForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Tautan URL YouTube <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
                  value={videoForm.youtubeUrl}
                  onChange={e => setVideoForm({ ...videoForm, youtubeUrl: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                />
                {extractYouTubeId(videoForm.youtubeUrl) ? (
                  <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-video relative">
                    <img
                      src={`https://img.youtube.com/vi/${extractYouTubeId(videoForm.youtubeUrl)}/hqdefault.jpg`}
                      alt="Thumbnail Pratinjau"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white font-mono text-[10px]">
                      ID Terdeteksi: {extractYouTubeId(videoForm.youtubeUrl)}
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400">
                    Sistem akan otomatis mengekstrak thumbnail dan Video ID dari link YouTube.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Kategori</label>
                  <select
                    value={videoForm.category}
                    onChange={e => setVideoForm({ ...videoForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Kegiatan">Kegiatan</option>
                    <option value="Prestasi">Prestasi</option>
                    <option value="Pembelajaran">Pembelajaran</option>
                    <option value="Profil">Profil</option>
                    <option value="Umum">Umum</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Tanggal Rekaman / Rilis</label>
                  <input
                    type="text"
                    value={videoForm.date}
                    onChange={e => setVideoForm({ ...videoForm, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan singkat mengenai video..."
                  value={videoForm.description}
                  onChange={e => setVideoForm({ ...videoForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Simpan Video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Kombel Activity */}
      {isKombelActivityModalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-serif-title text-lg font-bold text-slate-900">
                {editingKombelActivity ? 'Edit Dokumentasi KOMBEL' : 'Tambah Dokumentasi Kegiatan KOMBEL'}
              </h3>
              <button onClick={() => setIsKombelActivityModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKombelActivity} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Judul Kegiatan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bedah Modul Ajar Kurikulum Merdeka"
                  value={kombelActivityForm.title}
                  onChange={e => setKombelActivityForm({ ...kombelActivityForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Tanggal Pelaksanaan</label>
                  <input
                    type="text"
                    required
                    value={kombelActivityForm.date}
                    onChange={e => setKombelActivityForm({ ...kombelActivityForm, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Jumlah Guru Hadir</label>
                  <input
                    type="number"
                    value={kombelActivityForm.attendeesCount}
                    onChange={e =>
                      setKombelActivityForm({ ...kombelActivityForm, attendeesCount: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Narasumber / Fasilitator</label>
                <input
                  type="text"
                  value={kombelActivityForm.speaker}
                  onChange={e => setKombelActivityForm({ ...kombelActivityForm, speaker: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Ringkasan Kegiatan & Hasil</label>
                <textarea
                  rows={3}
                  required
                  value={kombelActivityForm.description}
                  onChange={e => setKombelActivityForm({ ...kombelActivityForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  {editingKombelActivity ? 'Kelola Foto Dokumentasi (1–5 foto)' : 'Unggah 3–5 Foto Dokumentasi'}
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleKombelActivityFilesChange}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                />
                <p className="text-[11px] text-slate-500">
                  {editingKombelActivity
                    ? 'Hapus foto dengan tombol × pada pratinjau, lalu unggah foto pengganti. Maksimal 5 foto.'
                    : 'Pilih 3 sampai 5 foto untuk satu kegiatan baru.'}
                  {' '}Ukuran total maksimal 8 MB.
                </p>
                {kombelActivityImages.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-2">
                    {kombelActivityImages.map((image, index) => (
                      <div key={`${editingKombelActivity?.id || 'new'}-${index}`} className="relative h-14 w-20 shrink-0">
                        <img
                          src={image}
                          alt={`Foto kegiatan ${index + 1}`}
                          className="h-full w-full rounded border border-slate-200 object-cover"
                        />
                        <button
                          type="button"
                          aria-label={`Hapus foto dokumentasi ${index + 1}`}
                          title="Hapus foto ini"
                          onClick={() => setKombelActivityImages(current => current.filter((_, photoIndex) => photoIndex !== index))}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-sm font-bold leading-none text-white shadow hover:bg-rose-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsKombelActivityModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Simpan Dokumentasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Kombel Agenda */}
      {isKombelAgendaModalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-serif-title text-lg font-bold text-slate-900">
                {editingKombelAgenda ? 'Edit Agenda KOMBEL' : 'Jadwalkan Agenda Mingguan KOMBEL'}
              </h3>
              <button onClick={() => setIsKombelAgendaModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKombelAgenda} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Topik / Judul Agenda</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Evaluasi Capaian Pembelajaran & Asesmen Sumatif"
                  value={kombelAgendaForm.title}
                  onChange={e => setKombelAgendaForm({ ...kombelAgendaForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Hari / Tanggal</label>
                  <input
                    type="text"
                    required
                    value={kombelAgendaForm.date}
                    onChange={e => setKombelAgendaForm({ ...kombelAgendaForm, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Waktu Pelaksanaan</label>
                  <input
                    type="text"
                    required
                    value={kombelAgendaForm.time}
                    onChange={e => setKombelAgendaForm({ ...kombelAgendaForm, time: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Tempat Pelaksanaan</label>
                <input
                  type="text"
                  required
                  value={kombelAgendaForm.location}
                  onChange={e => setKombelAgendaForm({ ...kombelAgendaForm, location: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Moderator / Koordinator</label>
                <input
                  type="text"
                  value={kombelAgendaForm.moderator}
                  onChange={e => setKombelAgendaForm({ ...kombelAgendaForm, moderator: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Deskripsi / Target Diskusi</label>
                <textarea
                  rows={3}
                  required
                  value={kombelAgendaForm.description}
                  onChange={e => setKombelAgendaForm({ ...kombelAgendaForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsKombelAgendaModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isUserFormOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full max-w-lg space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{editingUserAccount ? 'Edit Akun Pengguna' : 'Tambah Akun Pengguna'}</h3>
                <p className="mt-1 text-xs text-slate-500">Perubahan disimpan ke PostgreSQL.</p>
              </div>
              <button onClick={() => setIsUserFormOpen(false)} className="rounded p-1 text-slate-400 hover:text-slate-700" aria-label="Tutup"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSaveUserAccount} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Nama lengkap</label>
                <input required maxLength={160} value={userAccountForm.fullName} onChange={event => setUserAccountForm({ ...userAccountForm, fullName: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Username / NISN / NIP</label>
                <input required maxLength={100} value={userAccountForm.username} onChange={event => setUserAccountForm({ ...userAccountForm, username: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email pemulihan (opsional)</label>
                <input type="email" maxLength={254} value={userAccountForm.email} onChange={event => setUserAccountForm({ ...userAccountForm, email: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Peran akses</label>
                <select value={userAccountForm.role} onChange={event => setUserAccountForm({ ...userAccountForm, role: event.target.value as UserRole })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900">
                  <option value="siswa">Siswa</option><option value="guru">Guru</option><option value="admin">Admin</option><option value="kepala_sekolah">Kepala Sekolah</option><option value="ketua_kombel">Ketua KOMBEL</option>
                </select>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
                {editingUserAccount
                  ? 'Jika akun tertaut ke profil siswa/guru, nama, email, dan NISN/NIP pada profil akan ikut diperbarui. Reset sandi tersedia pada tabel akun.'
                  : 'Sandi sementara dibuat otomatis dan wajib diganti saat login pertama. Akun siswa/guru harus memakai NISN/NIP dari profil yang sudah terdaftar.'}
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
                <button type="button" onClick={() => setIsUserFormOpen(false)} className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Batal</button>
                <button type="submit" disabled={isSavingUserAccount} className="rounded-lg bg-blue-900 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">
                  {isSavingUserAccount ? 'Menyimpan...' : editingUserAccount ? 'Simpan Perubahan' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Admin Password Reset */}
      {isResetModalOpen && selectedUserForReset && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-900" />
                <h3 className="font-serif-title text-lg font-bold text-slate-900">
                  Reset Kata Sandi Pengguna
                </h3>
              </div>
              <button onClick={() => setIsResetModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Akun:</span>
                <span className="font-bold text-slate-900">{selectedUserForReset.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Username / ID:</span>
                <span className="font-mono font-bold text-blue-900">{selectedUserForReset.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Peran Sistem:</span>
                <span className="font-semibold text-slate-800">
                  {selectedUserForReset.role.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            {resetSuccessMessage ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{resetSuccessMessage}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-emerald-700 block">
                    Kata sandi sementara baru yang dapat diberikan kepada pengguna:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={tempPasswordInput}
                      className="w-full bg-white px-3 py-1.5 font-mono text-xs font-bold border border-emerald-300 rounded text-slate-900 select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyTempPassword}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? 'Disalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-emerald-600">
                  Pengguna akan diminta mengganti kata sandi ini saat pertama kali berhasil login.
                </p>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                >
                  Selesai
                </button>
              </div>
            ) : (
              <form onSubmit={handleExecuteAdminReset} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Kata Sandi Sementara (Temporary Password) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={12}
                    value={tempPasswordInput}
                    onChange={e => setTempPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">
                    Sistem telah menghasilkan sandi sementara acak. Anda dapat mengubahnya jika diperlukan.
                  </p>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 space-y-1">
                  <strong>Pemberitahuan Keamanan:</strong>
                  <p>
                    Setelah direset, bendera <em>mustChangePassword</em> akan diaktifkan secara otomatis pada akun ini demi mematuhi standar keamanan sekolah.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800 font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    Terapkan Reset Sandi
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
