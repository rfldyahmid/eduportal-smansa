import React, { useState } from 'react';
import { UserAccount, UserRole } from '../../types';
import { setActiveSession } from '../../utils/storage';
import { apiLogin, apiChangePassword, apiForgotPassword, apiResetPassword, clearAuthToken } from '../../utils/api';
import {
  Lock,
  User,
  ShieldCheck,
  X,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  HelpCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  ChevronDown
} from 'lucide-react';
import logoSekolah from '../../assets/images/logo-sekolah.png';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'forgot' | 'resetWithToken' | 'changeInitial'>('login');
  const [pendingChangeUser, setPendingChangeUser] = useState<UserAccount | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('siswa');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password form
  const [forgotInput, setForgotInput] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (!isOpen) return null;

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const { user } = await apiLogin(username.trim().replace(/\s+/g, ''), password);

      // Admin access includes the separate school leadership and KOMBEL accounts.
      const isAdminAccess = selectedRole === 'admin' && (
        user.role === 'admin' || user.role === 'kepala_sekolah' || user.role === 'ketua_kombel'
      );
      if (user.role !== selectedRole && !isAdminAccess) {
        clearAuthToken();
        setErrorMsg(`Akun ini terdaftar sebagai peran ${user.role.replace('_', ' ').toUpperCase()}, bukan ${selectedRole.replace('_', ' ').toUpperCase()}. Silakan sesuaikan jenis pengguna.`);
        setIsSubmitting(false);
        return;
      }

      if (user.mustChangePassword) {
        setPendingChangeUser(user);
        setNewPassword('');
        setConfirmPassword('');
        setMode('changeInitial');
        setSuccessMsg('Demi keamanan akun, kata sandi awal wajib diganti sebelum menggunakan portal.');
        return;
      }

      setActiveSession(user);
      onSuccess(user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login gagal. Periksa username dan kata sandi Anda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeInitialPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingChangeUser) return;
    if (newPassword.length < 12) {
      setErrorMsg('Kata sandi baru minimal 12 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    if (newPassword === password) {
      setErrorMsg('Kata sandi baru harus berbeda dari kata sandi awal.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);
    try {
      const result = await apiChangePassword(password, newPassword);
      setActiveSession(result.user);
      setPendingChangeUser(null);
      setPassword('');
      onSuccess(result.user);
      onClose();
    } catch (error: any) {
      setErrorMsg(error?.message || 'Kata sandi gagal diperbarui. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotInput.trim()) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const res = await apiForgotPassword(forgotInput.trim());
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mengajukan permohonan reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim() || !newPassword) return;
    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    if (newPassword.length < 12) {
      setErrorMsg('Kata sandi baru harus minimal 12 karakter.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const res = await apiResetPassword(resetToken.trim(), newPassword);
      setSuccessMsg(res.message);
      setTimeout(() => {
        setMode('login');
        setPassword('');
        setSuccessMsg('Kata sandi berhasil direset! Silakan masuk dengan kata sandi baru Anda.');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mereset kata sandi. Pastikan token masih berlaku.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-sky-100/95 p-4 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative my-auto w-full max-w-md overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-xl shadow-sky-900/10">
        <div className="px-6 pb-2 pt-8 text-center sm:px-9">
          <button
            onClick={onClose}
            aria-label="Tutup login"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            <X className="w-5 h-5" />
          </button>

          <img src={logoSekolah} alt="Logo SMAN 1 Halmahera Tengah" className="school-logo-3d mx-auto h-24 w-24 object-contain sm:h-28 sm:w-28" />
          <h2 className="mt-4 text-2xl font-extrabold tracking-wide text-blue-900">EDUPORTAL</h2>
          <h3 className="mt-1 text-sm font-bold text-slate-700">SMAN 1 HALMAHERA TENGAH</h3>
          <p className="mt-1 text-xs text-slate-500">Portal Pembelajaran Siswa dan Guru</p>
          {mode !== 'login' && <p className="mt-4 text-sm font-semibold text-blue-900">{mode === 'changeInitial' ? 'Ganti Kata Sandi Awal' : 'Pemulihan Kata Sandi'}</p>}
        </div>

        {/* Modal Body */}
        <div className="space-y-4 px-6 pb-6 pt-4 sm:px-9">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'login' && (
            <>
              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="login-username" className="text-xs font-semibold text-slate-700">
                    Username / NIS / NIP
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="login-username"
                      type="text"
                      required
                      autoComplete="username"
                      placeholder="Username / NIS / NIP atau email terdaftar"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-12 w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className="text-xs font-semibold text-slate-700">Kata Sandi (Password)</label>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg('');
                        setSuccessMsg('');
                        setMode('forgot');
                      }}
                      className="text-xs font-semibold text-blue-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                    >
                      Lupa Kata Sandi?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-12 text-sm focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="login-role" className="text-xs font-semibold text-slate-700">Jenis Pengguna</label>
                  <div className="relative">
                    <select
                      id="login-role"
                      value={selectedRole}
                      onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                      className="h-12 w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-10 text-sm text-slate-800 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="siswa">Siswa</option>
                      <option value="guru">Guru</option>
                      <option value="admin">Admin</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-800 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <KeyRound className="w-4 h-4 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>LOGIN</span>
                    </>
                  )}
                </button>
              </form>

              {/* Help & Assistance Note */}
              <div className="space-y-1 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                  <HelpCircle className="h-4 w-4 text-blue-800 dark:text-sky-300" />
                  <span>Bantuan Akun Sekolah:</span>
                </div>
                <p className="leading-relaxed">
                  Akun awal siswa menggunakan NISN, dan Bapak/Ibu guru menggunakan NIP. Jika mengalami kendala masuk, silakan hubungi Ruang Tata Usaha SMAN 1 Halmahera Tengah.
                </p>
              </div>
            </>
          )}

          {mode === 'changeInitial' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                Akun <strong>{pendingChangeUser?.fullName}</strong> masih menggunakan kata sandi awal. Ganti sekarang untuk membuka portal.
              </div>
              <form onSubmit={handleChangeInitialPassword} className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="initial-new-password" className="text-xs font-semibold text-slate-700">Kata sandi baru (minimal 12 karakter)</label>
                  <input id="initial-new-password" type="password" required minLength={12} autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="initial-confirm-password" className="text-xs font-semibold text-slate-700">Ulangi kata sandi baru</label>
                  <input id="initial-confirm-password" type="password" required minLength={12} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900" />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-blue-900 py-2.5 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50">
                  {isSubmitting ? 'Memperbarui...' : 'Ganti dan Masuk'}
                </button>
              </form>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-900">Ajukan Pemulihan Kata Sandi</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Masukkan NISN siswa, NIP guru, atau email pemulihan yang terdaftar. Token dikirim ke email aktif pada akun.
                </p>
              </div>

              <form onSubmit={handleRequestReset} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">NISN / NIP / Email</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 0071234567 atau NIP guru"
                    value={forgotInput}
                    onChange={(e) => setForgotInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all"
                >
                  {isSubmitting ? 'Memproses Permintaan...' : 'Kirim Permohonan Reset'}
                </button>
              </form>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <span className="font-bold block">Reset Terkelola Sekolah:</span>
                <p className="leading-relaxed text-[11px]">
                  Jika email tidak terdaftar atau sudah tidak dapat diakses, hubungi <strong>Wali Kelas</strong> atau <strong>Admin Tata Usaha</strong>. Admin dapat menerbitkan sandi sementara melalui menu Kelola Akun &amp; Sandi.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMode('resetWithToken')}
                className="w-full rounded-lg border border-blue-200 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-50"
              >
                Saya sudah menerima token email
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Halaman Masuk</span>
              </button>
            </div>
          )}

          {mode === 'resetWithToken' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-900">Buat Kata Sandi Baru</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Masukkan token yang dikirim ke email terdaftar dan tentukan kata sandi baru (minimal 12 karakter).
                </p>
              </div>

              <form onSubmit={handleExecuteReset} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Token Pemulihan</label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Kata Sandi Baru (min 12 karakter)</label>
                  <input
                    type="password"
                    required
                    minLength={12}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Ulangi Kata Sandi Baru</label>
                  <input
                    type="password"
                    required
                    minLength={12}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-900 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all"
                >
                  {isSubmitting ? 'Menyimpan Sandi...' : 'Simpan Kata Sandi Baru'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Batal & Kembali ke Login</span>
              </button>
            </div>
          )}

          <div className="pt-1 text-center text-[11px] leading-relaxed text-slate-500">
            <p>© 2026 SMAN 1 HALMAHERA TENGAH</p>
            <p>EDUPORTAL — Portal Pembelajaran Sekolah</p>
          </div>
        </div>
      </div>
    </div>
  );
};
