import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import type { UserAccount, UserRole } from '../src/types/index';
import { getDb } from './db';

const JWT_SECRET = process.env.ADMIN_SECRET || process.env.JWT_SECRET || 'sman1_halteng_secure_production_secret_key_2026';

export interface AuthPayload {
  sub: string;
  username: string;
  role: UserRole;
  fullName: string;
  email: string;
  linkedId?: string;
  credentialVersion: string;
  exp: number;
}

function credentialVersion(user: UserAccount): string {
  return crypto.createHash('sha256').update(`${user.salt}:${user.passwordHash}`).digest('hex');
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export function generateSalt(bytes = 16): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const computed = hashPassword(password, salt);
    const bufA = Buffer.from(computed, 'hex');
    const bufB = Buffer.from(expectedHash, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function createToken(user: UserAccount, expiresInHours = 12): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload: AuthPayload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    linkedId: user.linkedId,
    credentialVersion: credentialVersion(user),
    exp: Date.now() + expiresInHours * 60 * 60 * 1000
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${encodedPayload}`)
    .digest('base64url');
  return `${header}.${encodedPayload}.${signature}`;
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');
    const bufA = Buffer.from(signature);
    const bufB = Buffer.from(expectedSig);
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      return null;
    }
    const data: AuthPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) {
      return res.status(401).json({ message: 'Autentikasi diperlukan. Silakan login terlebih dahulu.' });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Sesi login tidak valid atau telah berakhir.' });
    }

    const db = await getDb();
    const account = db.users.find(user => user.id === decoded.sub);
    if (!account) {
      return res.status(401).json({ message: 'Akun sudah tidak aktif. Silakan masuk kembali.' });
    }
    if (decoded.credentialVersion !== credentialVersion(account)) {
      return res.status(401).json({ message: 'Kata sandi akun telah berubah. Silakan masuk kembali.' });
    }
    if (account.mustChangePassword && req.path !== '/api/auth/change-password' && req.path !== '/api/auth/me') {
      return res.status(403).json({
        code: 'PASSWORD_CHANGE_REQUIRED',
        message: 'Ganti kata sandi awal sebelum menggunakan portal.'
      });
    }

    // Use current account data so role changes and account updates take effect immediately.
    req.user = {
      ...decoded,
      username: account.username,
      role: account.role,
      fullName: account.fullName,
      email: account.email,
      linkedId: account.linkedId
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Anda tidak memiliki hak akses untuk tindakan ini.' });
      }
      next();
    });
  };
}

export const requireAdmin = requireRole(['admin']);
export const requireAdminOrKombel = requireRole(['admin', 'ketua_kombel']);
export const requireAdminOrTeacher = requireRole(['admin', 'guru']);
export const requireStaff = requireRole(['admin', 'guru', 'kepala_sekolah', 'ketua_kombel']);
